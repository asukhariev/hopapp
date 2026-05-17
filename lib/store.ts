import { put, list } from "@vercel/blob";
import type { Session } from "./types";

/**
 * Session storage backed by Vercel Blob (one JSON file per session).
 * Keys: sessions/<id>.json
 * No DB — keeps the v0 stack minimal. Concurrency is low (one runner, a few clicks).
 */

const PREFIX = "sessions/";

const blobToken = process.env.BLOB_READ_WRITE_TOKEN || "";

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
  });
  return s;
}

export async function getSession(id: string): Promise<Session | null> {
  // The SDK's head() wants a full URL, not a pathname. Easiest: list with a
  // tight prefix and filter. One list call per get — fine for v0 throughput.
  try {
    const { blobs } = await list({
      prefix: key(id),
      limit: 1,
      token: blobToken || undefined,
    });
    if (!blobs.length) return null;
    const r = await fetch(blobs[0].url, { cache: "no-store" });
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
  const sessions = await listSessions(100);
  // Prefer pending_stop over pending_start so a Stop click takes priority
  return (
    sessions.find((s) => s.status === "pending_stop") ||
    sessions.find((s) => s.status === "pending_start") ||
    null
  );
}
