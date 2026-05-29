"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { Customer, EvaluationType } from "@/lib/types";
import { intendedMr4SubjectName, isWired } from "@/lib/mr4";

async function fetchCustomer(id: string): Promise<Customer> {
  const r = await fetch(`/api/customers/${id}`, { cache: "no-store" });
  if (!r.ok) throw new Error("failed to load patient");
  return (await r.json()).customer as Customer;
}

// Patient screen: live MR4 link state + evaluations gated on it.
//  - opening auto-triggers a find (runner reads MR4's store for our code)
//  - "wired" shows instantly for already-linked patients and enables evaluations
//  - "not_found" shows the Create & link action
export default function PatientWorkspace({
  customer: initial,
  types,
}: {
  customer: Customer;
  types: EvaluationType[];
}) {
  const qc = useQueryClient();
  const id = initial.id;

  const { data: customer = initial } = useQuery({
    queryKey: ["customer", id],
    queryFn: () => fetchCustomer(id),
    initialData: initial,
    // Poll only while the runner is mid-flight; stop once resolved.
    refetchInterval: (q) => {
      const s = q.state.data?.mr4_link_status;
      return s === "checking" || s === "linking" ? 1500 : false;
    },
  });

  const wired = isWired(customer);
  const status = customer.mr4_link_status;
  const subjectName = intendedMr4SubjectName(customer.name, customer.mr4_code);

  async function post(path: string) {
    await fetch(`/api/customers/${id}/${path}`, { method: "POST" });
    await qc.invalidateQueries({ queryKey: ["customer", id] });
  }

  // On open: if not wired and nothing in flight, kick a live find. Runs once
  // per mount (the filesystem check is cheap and doesn't drive the MR4 UI).
  const kicked = useRef(false);
  useEffect(() => {
    if (kicked.current) return;
    if (!wired && status !== "checking" && status !== "linking") {
      kicked.current = true;
      post("mr4-find");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <h2 className="text-xs font-semibold uppercase tracking-wider text-black/50 dark:text-white/50 mb-3">
        Noraxon MR4 subject
      </h2>
      <section className="mb-8">
        <Mr4Panel
          wired={wired}
          status={status}
          subjectName={subjectName}
          subjectStored={customer.mr4_subject_name}
          linkedAt={customer.mr4_linked_at}
          proofUrl={customer.mr4_proof_url}
          error={customer.mr4_link_error}
          onCreate={() => post("mr4-link")}
          onRecheck={() => post("mr4-find")}
        />
      </section>

      <h2 className="text-xs font-semibold uppercase tracking-wider text-black/50 dark:text-white/50 mb-3">
        Analyses
      </h2>
      <div className="grid gap-3">
        {types.map((t) =>
          wired ? (
            <Link
              key={t.key}
              href={`/customers/${id}/analysis/${t.key}`}
              className="flex items-center justify-between rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-white/[0.03] px-5 py-4 hover:border-brand-coral hover:bg-brand-coral/[0.04] transition-colors"
            >
              <span className="font-medium">{t.name}</span>
              <span className="text-brand-coral text-lg">→</span>
            </Link>
          ) : (
            <div
              key={t.key}
              aria-disabled
              title="Wire this subject in MR4 to run evaluations"
              className="flex items-center justify-between rounded-xl border border-black/10 dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.02] px-5 py-4 opacity-50 cursor-not-allowed select-none"
            >
              <span className="font-medium">{t.name}</span>
              <span className="material-symbols-outlined text-lg text-black/40 dark:text-white/40">
                lock
              </span>
            </div>
          )
        )}
        {types.length === 0 && (
          <p className="text-black/45 dark:text-white/45 text-sm">No analyses configured.</p>
        )}
        {!wired && types.length > 0 && (
          <p className="mt-1 text-xs text-black/45 dark:text-white/45">
            Evaluations unlock once the subject is wired to Noraxon MR4.
          </p>
        )}
      </div>
    </>
  );
}

function Mr4Panel({
  wired,
  status,
  subjectName,
  subjectStored,
  linkedAt,
  proofUrl,
  error,
  onCreate,
  onRecheck,
}: {
  wired: boolean;
  status: Customer["mr4_link_status"];
  subjectName: string;
  subjectStored: string | null;
  linkedAt: string | null;
  proofUrl: string | null;
  error: string | null;
  onCreate: () => void;
  onRecheck: () => void;
}) {
  if (wired) {
    return (
      <div className="rounded-xl border border-emerald-600/30 bg-emerald-500/[0.07] px-5 py-4">
        <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 font-medium">
          <span className="material-symbols-outlined filled text-xl">check_circle</span>
          Wired to Noraxon MR4
        </div>
        <p className="mt-2 font-mono text-sm break-all">{subjectStored ?? subjectName}</p>
        {linkedAt && (
          <p className="mt-1 text-xs text-black/45 dark:text-white/45">
            Linked {new Date(linkedAt).toLocaleString()}
          </p>
        )}
        {proofUrl && (
          <a
            href={proofUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-3 inline-flex items-center gap-1 text-sm text-brand-blue hover:underline"
          >
            <span className="material-symbols-outlined text-base">image</span>
            View proof screenshot
          </a>
        )}
      </div>
    );
  }

  if (status === "checking" || status === "linking") {
    return (
      <div className="rounded-xl border border-amber-500/30 bg-amber-400/[0.08] px-5 py-4">
        <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 font-medium">
          <span className="material-symbols-outlined text-xl animate-spin">progress_activity</span>
          {status === "checking" ? "Checking Noraxon MR4…" : "Creating in Noraxon MR4…"}
        </div>
        <p className="mt-2 font-mono text-sm break-all">{subjectName}</p>
        <p className="mt-1 text-xs text-black/45 dark:text-white/45">
          Waiting for the lab runner to drive the MR4 software.
        </p>
      </div>
    );
  }

  // not_found / failed / unknown → offer Create & link
  const failed = status === "failed";
  return (
    <div
      className={`rounded-xl border px-5 py-4 ${
        failed
          ? "border-red-500/30 bg-red-500/[0.06]"
          : "border-black/10 dark:border-white/10 bg-white dark:bg-white/[0.03]"
      }`}
    >
      {failed ? (
        <div className="flex items-center gap-2 text-red-600 dark:text-red-400 font-medium">
          <span className="material-symbols-outlined text-xl">error</span>
          MR4 link failed
        </div>
      ) : (
        <p className="text-sm text-black/55 dark:text-white/55">
          Not yet in the Noraxon MR4 software. Will be created as:
        </p>
      )}

      <p className="mt-2 font-mono text-sm break-all">{subjectName}</p>

      {failed && error && (
        <p className="mt-1 text-xs text-red-600/80 dark:text-red-400/80 break-all">{error}</p>
      )}

      <div className="mt-4 flex items-center gap-3">
        <button
          onClick={onCreate}
          className="inline-flex items-center gap-2 rounded-lg bg-brand-coral text-white px-5 py-2 font-medium hover:opacity-90 transition-opacity"
        >
          <span className="material-symbols-outlined text-lg">person_add</span>
          {failed ? "Try create again" : "Create & link in MR4"}
        </button>
        <button onClick={onRecheck} className="text-sm text-brand-blue hover:underline">
          Re-check
        </button>
      </div>
    </div>
  );
}
