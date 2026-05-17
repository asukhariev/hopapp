"use client";

import { useEffect, useState } from "react";
import type { Session } from "@/lib/types";

const POLL_MS = 2000;

const statusLabel: Record<Session["status"], string> = {
  pending_start: "Pending start",
  recording: "Recording",
  pending_stop: "Pending stop",
  exporting: "Exporting",
  uploading: "Uploading",
  done: "Done",
  failed: "Failed",
};

const statusColor: Record<Session["status"], string> = {
  pending_start: "bg-amber-500",
  recording: "bg-emerald-500 animate-pulse",
  pending_stop: "bg-amber-500",
  exporting: "bg-sky-500 animate-pulse",
  uploading: "bg-sky-500 animate-pulse",
  done: "bg-emerald-600",
  failed: "bg-rose-600",
};

function bytes(n?: number) {
  if (!n) return "";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

export default function Home() {
  const [active, setActive] = useState<Session | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function tick() {
      try {
        const r = await fetch("/api/sessions", { cache: "no-store" });
        if (!r.ok) return;
        const { sessions } = (await r.json()) as { sessions: Session[] };
        if (cancelled) return;
        setSessions(sessions);
        if (active) {
          const refreshed = sessions.find((s) => s.id === active.id);
          if (refreshed) setActive(refreshed);
        } else {
          const inflight = sessions.find(
            (s) => s.status !== "done" && s.status !== "failed"
          );
          if (inflight) setActive(inflight);
        }
      } catch {
        /* swallow */
      }
    }
    tick();
    const t = setInterval(tick, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, [active]);

  async function start() {
    setError(null);
    setBusy(true);
    try {
      const r = await fetch("/api/sessions/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ device: "emg" }),
      });
      if (!r.ok) throw new Error(await r.text());
      const s = (await r.json()) as Session;
      setActive(s);
    } catch (e) {
      setError(e instanceof Error ? e.message : "start failed");
    } finally {
      setBusy(false);
    }
  }

  async function stop() {
    if (!active) return;
    setError(null);
    setBusy(true);
    try {
      const r = await fetch(`/api/sessions/${active.id}/stop`, {
        method: "POST",
      });
      if (!r.ok) throw new Error(await r.text());
      const s = (await r.json()) as Session;
      setActive(s);
    } catch (e) {
      setError(e instanceof Error ? e.message : "stop failed");
    } finally {
      setBusy(false);
    }
  }

  const isTerminal =
    active && (active.status === "done" || active.status === "failed");
  const canStop =
    active && !isTerminal && active.status !== "pending_stop" && !busy;

  return (
    <main className="mx-auto max-w-3xl px-6 py-12 font-sans text-slate-100">
      <header className="mb-10">
        <h1 className="text-3xl font-semibold tracking-tight">
          HopClaw <span className="text-slate-400 font-normal">/ hop.agtc.app</span>
        </h1>
        <p className="mt-2 text-slate-400">
          One-button driver for Noraxon MR4 export on the HOP Studio lab kit.
        </p>
      </header>

      <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 mb-8">
        {active ? (
          <>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <span
                  className={`inline-block w-3 h-3 rounded-full ${statusColor[active.status]}`}
                />
                <span className="font-medium">{statusLabel[active.status]}</span>
                <span className="text-slate-500 text-sm">· {active.id}</span>
              </div>
              <div className="text-xs text-slate-500">
                {active.device.toUpperCase()}
              </div>
            </div>
            <p className="text-slate-300 text-sm mb-6 min-h-[1.5em]">
              {active.progress ?? "..."}
            </p>
            {active.file_url && (
              <a
                href={active.file_url}
                target="_blank"
                rel="noopener"
                className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 px-4 py-2 text-sm font-medium mb-4"
              >
                Download {active.file_name ?? "file"} ({bytes(active.file_size_bytes)})
              </a>
            )}
            <div className="flex gap-3">
              {!isTerminal && (
                <button
                  disabled={!canStop}
                  onClick={stop}
                  className="rounded-lg bg-rose-600 hover:bg-rose-500 disabled:opacity-40 disabled:cursor-not-allowed px-5 py-2 font-medium"
                >
                  Stop & Export
                </button>
              )}
              {isTerminal && (
                <button
                  onClick={start}
                  disabled={busy}
                  className="rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 px-5 py-2 font-medium"
                >
                  Start new session
                </button>
              )}
            </div>
          </>
        ) : (
          <div className="text-center py-6">
            <p className="text-slate-400 mb-6">
              No active session. Click below to begin a recording on the lab kit.
            </p>
            <button
              onClick={start}
              disabled={busy}
              className="rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 px-6 py-3 font-medium text-lg"
            >
              Start session
            </button>
          </div>
        )}
        {error && <p className="text-rose-400 text-sm mt-3">{error}</p>}
      </section>

      <section>
        <h2 className="text-sm uppercase tracking-wider text-slate-400 mb-3">
          Recent sessions
        </h2>
        {sessions.length === 0 ? (
          <p className="text-slate-500 text-sm">No sessions yet.</p>
        ) : (
          <ul className="divide-y divide-slate-800 rounded-lg border border-slate-800">
            {sessions.slice(0, 10).map((s) => (
              <li
                key={s.id}
                className="flex items-center gap-3 px-4 py-3 text-sm hover:bg-slate-900/40"
              >
                <span
                  className={`inline-block w-2 h-2 rounded-full ${statusColor[s.status]}`}
                />
                <span className="font-mono text-xs text-slate-500 w-24 truncate">
                  {s.id}
                </span>
                <span className="text-slate-300 w-24">{statusLabel[s.status]}</span>
                <span className="text-slate-500 flex-1 truncate">{s.progress}</span>
                <span className="text-slate-500 text-xs">
                  {new Date(s.created_at).toLocaleTimeString()}
                </span>
                {s.file_url && (
                  <a
                    className="text-emerald-400 hover:text-emerald-300 text-xs"
                    href={s.file_url}
                    target="_blank"
                    rel="noopener"
                  >
                    Download
                  </a>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <footer className="mt-16 text-xs text-slate-600">
        Sessions list refreshes every {POLL_MS / 1000}s.
      </footer>
    </main>
  );
}
