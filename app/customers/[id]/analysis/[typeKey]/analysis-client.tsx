"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { AnalysisView, StepStatus } from "@/lib/types";

const dotClass: Record<StepStatus, string> = {
  pending: "bg-black/25 dark:bg-white/25",
  active: "bg-brand-blue animate-pulse",
  done: "bg-emerald-600",
  failed: "bg-red-600",
  skipped: "bg-black/20 dark:bg-white/20",
};

function fmtBytes(n?: number | null) {
  if (!n) return "";
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

async function fetchAnalysis(id: string, typeKey: string): Promise<AnalysisView> {
  const r = await fetch(`/api/customers/${id}/analysis/${typeKey}`, { cache: "no-store" });
  if (!r.ok) throw new Error("failed to load analysis");
  return r.json();
}

export default function AnalysisClient({ id, typeKey }: { id: string; typeKey: string }) {
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);

  const { data } = useQuery({
    queryKey: ["analysis", id, typeKey],
    queryFn: () => fetchAnalysis(id, typeKey),
    refetchInterval: 1500,
  });

  const type = data?.type;
  const latest = data?.latest ?? null;
  const steps = latest?.steps ?? [];
  const files = data?.files ?? [];
  const running = latest?.evaluation.status === "in_progress";
  const hasRun = !!latest;

  async function start() {
    setBusy(true);
    try {
      const r = await fetch("/api/evaluations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customer_id: id, type_key: typeKey }),
      });
      if (r.ok) await qc.invalidateQueries({ queryKey: ["analysis", id, typeKey] });
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <header className="mb-8 flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">{type?.name ?? "…"}</h1>
        <button
          onClick={start}
          disabled={busy || running}
          className="shrink-0 rounded-lg bg-brand-coral text-white px-4 py-2 font-medium hover:opacity-90 disabled:opacity-40 transition-opacity"
        >
          {running ? "Running…" : busy ? "Starting…" : hasRun ? "Run again" : "Start evaluation"}
        </button>
      </header>

      <h2 className="text-xs font-semibold uppercase tracking-wider text-black/50 dark:text-white/50 mb-3">
        Current run
      </h2>
      {steps.length === 0 ? (
        <p className="text-black/45 dark:text-white/45 text-sm mb-10">
          No run yet — press Start to begin.
        </p>
      ) : (
        <ol className="space-y-3 mb-10">
          {steps.map((s) => (
            <li
              key={s.id}
              className={`rounded-xl border p-4 ${
                s.status === "active"
                  ? "border-brand-blue/50 bg-brand-blue/5"
                  : "border-black/10 dark:border-white/10 bg-white dark:bg-white/[0.03]"
              }`}
            >
              <div className="flex items-center gap-3">
                <span className={`inline-block w-2.5 h-2.5 rounded-full ${dotClass[s.status]}`} />
                <span className="font-medium">{s.instructions ?? s.step_definition_id}</span>
                <span className="ml-auto text-[11px] uppercase tracking-wider text-black/40 dark:text-white/40">
                  {s.status}
                </span>
              </div>
              {s.status === "active" && s.progress && (
                <p className="mt-2 ml-5 text-sm text-brand-blue">{s.progress}</p>
              )}
              {s.status === "failed" && s.progress && (
                <p className="mt-2 ml-5 text-sm text-red-600">{s.progress}</p>
              )}
            </li>
          ))}
        </ol>
      )}

      <h2 className="text-xs font-semibold uppercase tracking-wider text-black/50 dark:text-white/50 mb-3">
        Saved files
      </h2>
      <ul className="rounded-xl border border-black/10 dark:border-white/10 overflow-hidden divide-y divide-black/10 dark:divide-white/10">
        {files.length === 0 && (
          <li className="px-4 py-6 text-black/45 dark:text-white/45 text-sm">No files yet.</li>
        )}
        {files.map((f) => (
          <li key={f.id} className="flex items-center justify-between px-4 py-3 text-sm">
            <div className="min-w-0">
              <div className="truncate">{f.name}</div>
              <div className="text-xs text-black/40 dark:text-white/40">
                {new Date(f.created_at).toLocaleString()}
              </div>
            </div>
            <a
              href={f.url}
              target="_blank"
              rel="noopener"
              className="ml-3 shrink-0 font-medium text-brand-blue hover:underline whitespace-nowrap"
            >
              ↓ {fmtBytes(f.size_bytes)}
            </a>
          </li>
        ))}
      </ul>
    </>
  );
}
