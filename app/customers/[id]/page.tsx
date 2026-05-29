"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import type { Customer, Evaluation } from "@/lib/types";

export default function CustomerPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [busy, setBusy] = useState(false);

  async function load() {
    const r = await fetch(`/api/customers/${id}`, { cache: "no-store" });
    if (r.ok) {
      const d = await r.json();
      setCustomer(d.customer);
      setEvaluations(d.evaluations ?? []);
    }
  }
  useEffect(() => {
    if (id) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function startEvaluation() {
    setBusy(true);
    try {
      const r = await fetch("/api/evaluations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customer_id: id }),
      });
      if (r.ok) {
        const ev = (await r.json()) as Evaluation;
        router.push(`/evaluations/${ev.id}`);
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <Link href="/" className="text-sm text-brand-blue hover:underline">
        ← Users
      </Link>
      <header className="mt-3 mb-8 flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">{customer?.name ?? "…"}</h1>
        <button
          onClick={startEvaluation}
          disabled={busy}
          className="shrink-0 rounded-lg bg-brand-coral text-white px-4 py-2 font-medium hover:opacity-90 disabled:opacity-40 transition-opacity"
        >
          {busy ? "Starting…" : "New evaluation"}
        </button>
      </header>

      <h2 className="text-xs font-semibold uppercase tracking-wider text-black/50 dark:text-white/50 mb-3">
        Evaluations
      </h2>
      <ul className="rounded-xl border border-black/10 dark:border-white/10 overflow-hidden divide-y divide-black/10 dark:divide-white/10">
        {evaluations.length === 0 && (
          <li className="px-4 py-6 text-black/45 dark:text-white/45 text-sm">No evaluations yet.</li>
        )}
        {evaluations.map((e) => (
          <li key={e.id}>
            <Link
              href={`/evaluations/${e.id}`}
              className="flex items-center justify-between px-4 py-3 hover:bg-black/[0.03] dark:hover:bg-white/[0.06] transition-colors"
            >
              <span className="font-medium capitalize">{e.status.replace("_", " ")}</span>
              <span className="text-xs text-black/40 dark:text-white/40">
                {new Date(e.created_at).toLocaleString()}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
