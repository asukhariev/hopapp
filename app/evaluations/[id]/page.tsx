"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import type { EvaluationDetail, StepStatus } from "@/lib/types";

const dotClass: Record<StepStatus, string> = {
  pending: "bg-slate-700",
  active: "bg-sky-500 animate-pulse",
  done: "bg-emerald-500",
  failed: "bg-rose-600",
  skipped: "bg-slate-600",
};

function fmtBytes(n?: number | null) {
  if (!n) return "";
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

export default function EvaluationPage() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<EvaluationDetail | null>(null);

  useEffect(() => {
    if (!id) return;
    let stopped = false;
    async function load() {
      const r = await fetch(`/api/evaluations/${id}`, { cache: "no-store" });
      if (r.ok && !stopped) setData(await r.json());
    }
    load();
    const t = setInterval(load, 1500);
    return () => {
      stopped = true;
      clearInterval(t);
    };
  }, [id]);

  const ev = data?.evaluation;
  const steps = data?.steps ?? [];
  const files = data?.files ?? [];

  return (
    <main className="mx-auto max-w-2xl px-6 py-12 font-sans text-slate-100">
      <Link
        href={ev ? `/customers/${ev.customer_id}` : "/"}
        className="text-sm text-slate-400 hover:text-slate-200"
      >
        ← Back
      </Link>
      <header className="mt-3 mb-8 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Evaluation</h1>
        {ev && (
          <span className="text-xs font-medium rounded-full px-3 py-1 bg-slate-800 text-slate-200 capitalize">
            {ev.status.replace("_", " ")}
          </span>
        )}
      </header>

      <h2 className="text-sm uppercase tracking-wider text-slate-400 mb-3">Steps</h2>
      <ol className="space-y-3 mb-10">
        {steps.map((s) => (
          <li
            key={s.id}
            className={`rounded-xl border p-4 ${
              s.status === "active" ? "border-sky-700 bg-sky-950/30" : "border-slate-800 bg-slate-900/40"
            }`}
          >
            <div className="flex items-center gap-3">
              <span className={`inline-block w-2.5 h-2.5 rounded-full ${dotClass[s.status]}`} />
              <span className="font-medium">{s.instructions ?? s.step_definition_id}</span>
              <span className="ml-auto text-[11px] uppercase tracking-wider text-slate-500">
                {s.status} · {s.kind}
              </span>
            </div>
            {s.status === "active" && s.progress && (
              <p className="mt-2 ml-5 text-sm text-sky-300">{s.progress}</p>
            )}
            {s.status === "failed" && s.progress && (
              <p className="mt-2 ml-5 text-sm text-rose-300">{s.progress}</p>
            )}
          </li>
        ))}
        {steps.length === 0 && <li className="text-slate-500 text-sm">No steps.</li>}
      </ol>

      <h2 className="text-sm uppercase tracking-wider text-slate-400 mb-3">Files</h2>
      <ul className="divide-y divide-slate-800 rounded-lg border border-slate-800 overflow-hidden">
        {files.length === 0 && <li className="px-4 py-6 text-slate-500 text-sm">No files yet.</li>}
        {files.map((f) => (
          <li key={f.id} className="flex items-center justify-between px-4 py-3 text-sm">
            <span className="truncate text-slate-300">{f.name}</span>
            <a
              href={f.url}
              target="_blank"
              rel="noopener"
              className="ml-3 shrink-0 text-emerald-400 hover:text-emerald-300 text-xs whitespace-nowrap"
            >
              ↓ {fmtBytes(f.size_bytes)}
            </a>
          </li>
        ))}
      </ul>
    </main>
  );
}
