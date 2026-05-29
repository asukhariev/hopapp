"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import type { EvaluationDetail, StepStatus } from "@/lib/types";

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
    <main className="mx-auto max-w-2xl px-6 py-12">
      <Link
        href={ev ? `/customers/${ev.customer_id}` : "/"}
        className="text-sm text-brand-blue hover:underline"
      >
        ← Back
      </Link>
      <header className="mt-3 mb-8 flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">Evaluation</h1>
        {ev && (
          <span className="text-xs font-medium rounded-full px-3 py-1 bg-black/5 dark:bg-white/10 capitalize">
            {ev.status.replace("_", " ")}
          </span>
        )}
      </header>

      <h2 className="text-xs font-semibold uppercase tracking-wider text-black/50 dark:text-white/50 mb-3">
        Steps
      </h2>
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
                {s.status} · {s.kind}
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
        {steps.length === 0 && (
          <li className="text-black/45 dark:text-white/45 text-sm">No steps.</li>
        )}
      </ol>

      <h2 className="text-xs font-semibold uppercase tracking-wider text-black/50 dark:text-white/50 mb-3">
        Files
      </h2>
      <ul className="rounded-xl border border-black/10 dark:border-white/10 overflow-hidden divide-y divide-black/10 dark:divide-white/10">
        {files.length === 0 && (
          <li className="px-4 py-6 text-black/45 dark:text-white/45 text-sm">No files yet.</li>
        )}
        {files.map((f) => (
          <li key={f.id} className="flex items-center justify-between px-4 py-3 text-sm">
            <span className="truncate">{f.name}</span>
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
    </main>
  );
}
