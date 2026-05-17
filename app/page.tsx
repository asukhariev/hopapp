"use client";

import { useEffect, useMemo, useState } from "react";
import type { Session, SessionStatus } from "@/lib/types";
import { BUSY_STATUSES, LIVE_STATUSES, TERMINAL_STATUSES } from "@/lib/types";

const POLL_MS = 2000;

const statusLabel: Record<SessionStatus, string> = {
  pending_start: "Starting…",
  recording:     "Recording",
  pending_stop:  "Stopping…",
  exporting:     "Exporting from MR4…",
  uploading:     "Uploading file…",
  done:          "Done",
  failed:        "Failed",
};

const statusPill: Record<SessionStatus, string> = {
  pending_start: "bg-amber-500/90 text-amber-50",
  recording:     "bg-emerald-500 text-emerald-50",
  pending_stop:  "bg-amber-500/90 text-amber-50",
  exporting:     "bg-sky-500 text-sky-50",
  uploading:     "bg-sky-500 text-sky-50",
  done:          "bg-emerald-700 text-emerald-50",
  failed:        "bg-rose-700 text-rose-50",
};

const stepOrder: SessionStatus[] = [
  "pending_start",
  "recording",
  "exporting",
  "uploading",
  "done",
];

function stepIndex(s: SessionStatus): number {
  if (s === "pending_stop") return 2;
  const i = stepOrder.indexOf(s);
  return i === -1 ? 0 : i;
}

function fmtBytes(n?: number) {
  if (!n) return "";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

function Spinner({ className = "" }: { className?: string }) {
  return (
    <svg
      className={`animate-spin ${className}`}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      width="16"
      height="16"
    >
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.25" />
      <path
        fill="currentColor"
        d="M4 12a8 8 0 0 1 8-8V0C5.4 0 0 5.4 0 12h4z"
      />
    </svg>
  );
}

function Stepper({ status }: { status: SessionStatus }) {
  const labels = ["Started", "Recording", "Exporting", "Uploading", "Done"];
  const current = stepIndex(status);
  const isFailed = status === "failed";

  return (
    <ol className="flex items-center gap-2 mt-4">
      {labels.map((l, i) => {
        const past = i < current;
        const active = i === current && !TERMINAL_STATUSES.includes(status);
        const done = i === current && status === "done";
        const failed = i === current && isFailed;
        const dotClass = failed
          ? "bg-rose-600"
          : done
          ? "bg-emerald-500"
          : past
          ? "bg-emerald-700"
          : active
          ? "bg-sky-500 animate-pulse"
          : "bg-slate-700";
        return (
          <li key={l} className="flex items-center gap-2">
            <span className={`inline-block w-2 h-2 rounded-full ${dotClass}`} />
            <span
              className={`text-[10px] uppercase tracking-wider ${
                past || active || done
                  ? "text-slate-300"
                  : "text-slate-600"
              } ${failed ? "text-rose-300" : ""}`}
            >
              {l}
            </span>
            {i < labels.length - 1 && (
              <span
                className={`inline-block w-6 h-px ${
                  past ? "bg-emerald-700" : "bg-slate-800"
                }`}
              />
            )}
          </li>
        );
      })}
    </ol>
  );
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
            (s) => !TERMINAL_STATUSES.includes(s.status)
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
      setActive(await r.json());
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
      const r = await fetch(`/api/sessions/${active.id}/stop`, { method: "POST" });
      if (!r.ok) throw new Error(await r.text());
      setActive(await r.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : "stop failed");
    } finally {
      setBusy(false);
    }
  }

  const isBusy   = active ? BUSY_STATUSES.includes(active.status) : false;
  const isLive   = active ? LIVE_STATUSES.includes(active.status) : false;
  const isDone   = active ? TERMINAL_STATUSES.includes(active.status) : false;
  const canStart = !active || isDone;
  const canStop  = active && isLive;

  const recentTerminated = useMemo(
    () => sessions.filter((s) => TERMINAL_STATUSES.includes(s.status)).slice(0, 8),
    [sessions]
  );

  return (
    <main className="mx-auto max-w-3xl px-6 py-12 font-sans text-slate-100">
      <header className="mb-10">
        <h1 className="text-3xl font-semibold tracking-tight">
          HopClaw{" "}
          <span className="text-slate-400 font-normal">/ hop.agtc.app</span>
        </h1>
        <p className="mt-2 text-slate-400">
          One-button driver for Noraxon MR4 export on the HOP Studio lab kit.
        </p>
      </header>

      {/* Active session card — fixed-height, no layout jumps */}
      <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 mb-8 min-h-[280px] flex flex-col">
        {active ? (
          <>
            <div className="flex items-center justify-between mb-3">
              <span
                className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium ${statusPill[active.status]}`}
              >
                {isBusy && <Spinner className="text-current" />}
                {statusLabel[active.status]}
              </span>
              <span className="text-xs text-slate-500 font-mono">
                {active.device.toUpperCase()} · {active.id}
              </span>
            </div>

            <Stepper status={active.status} />

            <p className="text-slate-300 text-sm mt-5 mb-2 min-h-[1.5em]">
              {active.progress ?? "..."}
            </p>

            {active.error && (
              <p className="text-rose-300 text-xs mb-3">Error: {active.error}</p>
            )}

            {active.file_url && (
              <a
                href={active.file_url}
                target="_blank"
                rel="noopener"
                className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 px-4 py-2 text-sm font-medium mb-4 self-start transition-colors"
              >
                ↓ Download {active.file_name ?? "file"} ({fmtBytes(active.file_size_bytes)})
              </a>
            )}

            <div className="flex gap-3 mt-auto pt-3">
              <button
                disabled={!canStop || busy}
                onClick={stop}
                className="flex-1 rounded-lg bg-rose-600 hover:bg-rose-500 disabled:bg-slate-800 disabled:text-slate-500 disabled:cursor-not-allowed px-5 py-2 font-medium transition-colors flex items-center justify-center gap-2"
                title={!canStop ? "Stop only available while recording" : ""}
              >
                {busy && <Spinner />}
                Stop & Export
              </button>
              <button
                disabled={!canStart || busy}
                onClick={start}
                className="flex-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-500 disabled:cursor-not-allowed px-5 py-2 font-medium transition-colors flex items-center justify-center gap-2"
                title={!canStart ? "Already a session running" : ""}
              >
                {busy && <Spinner />}
                {isDone ? "Start new session" : "Start session"}
              </button>
            </div>
          </>
        ) : (
          <div className="text-center flex-1 flex flex-col items-center justify-center">
            <p className="text-slate-400 mb-6">
              No active session. Click below to begin a recording on the lab kit.
            </p>
            <button
              onClick={start}
              disabled={busy}
              className="rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 px-6 py-3 font-medium text-lg flex items-center gap-2 transition-colors"
            >
              {busy && <Spinner />}
              Start session
            </button>
          </div>
        )}
        {error && <p className="text-rose-400 text-sm mt-3">{error}</p>}
      </section>

      {/* History — stable layout, only terminal sessions */}
      <section>
        <h2 className="text-sm uppercase tracking-wider text-slate-400 mb-3">
          Recent sessions
        </h2>
        {recentTerminated.length === 0 ? (
          <p className="text-slate-500 text-sm">No completed sessions yet.</p>
        ) : (
          <ul className="divide-y divide-slate-800 rounded-lg border border-slate-800 overflow-hidden">
            {recentTerminated.map((s) => (
              <li
                key={s.id}
                className="grid grid-cols-[auto_auto_1fr_auto_auto] items-center gap-3 px-4 py-3 text-sm hover:bg-slate-900/40"
              >
                <span
                  className={`inline-block w-2 h-2 rounded-full ${
                    s.status === "done" ? "bg-emerald-500" : "bg-rose-600"
                  }`}
                />
                <span className="font-mono text-xs text-slate-500 w-24 truncate">
                  {s.id}
                </span>
                <span className="text-slate-400 truncate">
                  {s.status === "done"
                    ? s.file_name ?? "(no file)"
                    : s.error ?? "Failed"}
                </span>
                <span className="text-slate-500 text-xs whitespace-nowrap">
                  {new Date(s.created_at).toLocaleTimeString()}
                </span>
                {s.file_url ? (
                  <a
                    className="text-emerald-400 hover:text-emerald-300 text-xs whitespace-nowrap"
                    href={s.file_url}
                    target="_blank"
                    rel="noopener"
                  >
                    ↓ {fmtBytes(s.file_size_bytes)}
                  </a>
                ) : (
                  <span />
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <footer className="mt-16 text-xs text-slate-600">
        Auto-refreshes every {POLL_MS / 1000}s · Locked to 1440×900 RDP
      </footer>
    </main>
  );
}
