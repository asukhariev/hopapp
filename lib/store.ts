import { put, list, del } from "@vercel/blob";
import type { Session } from "./types";

/**
 * Session storage backed by Vercel Blob (one JSON file per session).
 * Keys: sessions/<id>.json
 *
 * Plus a known "queue" blob at queue/pending.txt holding the IDs of sessions
 * the runner still needs to act on (one per line, suffixed with their stage).
 * We use this instead of list() because Blob's list endpoint has propagation
 * lag — recently-written sessions don't appear there for several seconds,
 * which breaks the runner's poll loop.
 */

const PREFIX = "sessions/";
const QUEUE_KEY = "queue/pending.txt";

const blobToken = process.env.BLOB_READ_WRITE_TOKEN || "";

// Token format: vercel_blob_rw_<STOREID>_<rest>
// Public blob URL: https://<storeid-lowercase>.public.blob.vercel-storage.com/<pathname>
// We need this so we can fetch blobs by URL directly (strongly consistent on
// the object itself), instead of going via list() which has propagation lag.
function publicBlobBase(): string {
  const m = blobToken.match(/^vercel_blob_rw_([A-Za-z0-9]+)_/);
  if (!m) return "";
  return `https://${m[1].toLowerCase()}.public.blob.vercel-storage.com`;
}

function blobUrl(pathname: string): string {
  // Cache-buster: Vercel Blob's public CDN caches with very long TTL by default.
  // We need fresh reads, so each request gets a unique query string.
  const bust = `t=${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  return `${publicBlobBase()}/${pathname}?${bust}`;
}

function key(id: string) {
  return `${PREFIX}${id}.json`;
}

export async function saveSession(s: Session): Promise<Session> {
  s.updated_at = new Date().toISOString();
  await put(key(s.id), JSON.stringify(s, null, 2), {
    access: "public",
    contentType: "application/json",
    allowOverwrite: true,
    token: blobToken || undefined,
    addRandomSuffix: false,
    cacheControlMaxAge: 0,
  });
  return s;
}

export async function getSession(id: string): Promise<Session | null> {
  // Fetch the blob by URL directly — strongly consistent for the object.
  try {
    const url = blobUrl(key(id));
    if (!url) return null;
    const r = await fetch(url, { cache: "no-store" });
    if (!r.ok) return null;
    return (await r.json()) as Session;
  } catch {
    return null;
  }
}

export async function listSessions(limit = 50): Promise<Session[]> {
  const { blobs } = await list({
    prefix: PREFIX,
    limit,
    token: blobToken || undefined,
  });
  const sessions = await Promise.all(
    blobs.map(async (b) => {
      try {
        const r = await fetch(b.url, { cache: "no-store" });
        if (!r.ok) return null;
        return (await r.json()) as Session;
      } catch {
        return null;
      }
    })
  );
  return sessions
    .filter((s): s is Session => !!s)
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
}

export async function findPendingForRunner(): Promise<Session | null> {
  // Read the explicit queue blob — strongly consistent on direct fetch,
  // unlike list() which has propagation lag.
  const ids = await readQueue();
  // Stop takes priority over Start so a Stop click cuts in
  const stopId = ids.find((e) => e.kind === "stop")?.id;
  const startId = ids.find((e) => e.kind === "start")?.id;
  const id = stopId ?? startId ?? null;
  if (!id) return null;
  return await getSession(id);
}

type QueueEntry = { id: string; kind: "start" | "stop" };

async function readQueue(): Promise<QueueEntry[]> {
  try {
    const url = blobUrl(QUEUE_KEY);
    if (!url) return [];
    const r = await fetch(url, { cache: "no-store" });
    if (!r.ok) return [];
    const text = (await r.text()).trim();
    if (!text) return [];
    return text
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const [id, kind] = line.split(",");
        return { id, kind: kind as "start" | "stop" };
      });
  } catch {
    return [];
  }
}

async function writeQueue(entries: QueueEntry[]): Promise<void> {
  const text = entries.length
    ? entries.map((e) => `${e.id},${e.kind}`).join("\n")
    : "\n"; // empty body rejected; placeholder
  await put(QUEUE_KEY, text, {
    access: "public",
    contentType: "text/plain",
    allowOverwrite: true,
    token: blobToken || undefined,
    addRandomSuffix: false,
    cacheControlMaxAge: 0,
  });
}

export async function enqueueStart(id: string): Promise<void> {
  const q = await readQueue();
  // Replace any prior entry for this id with a fresh start
  const filtered = q.filter((e) => e.id !== id);
  filtered.push({ id, kind: "start" });
  await writeQueue(filtered);
}

export async function enqueueStop(id: string): Promise<void> {
  const q = await readQueue();
  const filtered = q.filter((e) => e.id !== id);
  filtered.push({ id, kind: "stop" });
  await writeQueue(filtered);
}

export async function dequeue(id: string): Promise<void> {
  const q = await readQueue();
  const filtered = q.filter((e) => e.id !== id);
  if (filtered.length === q.length) return;
  await writeQueue(filtered);
}
