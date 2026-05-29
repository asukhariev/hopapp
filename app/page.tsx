"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import type { Customer } from "@/lib/types";

export default function Home() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  async function load() {
    const r = await fetch("/api/customers", { cache: "no-store" });
    if (r.ok) setCustomers((await r.json()).customers ?? []);
  }
  useEffect(() => {
    load();
  }, []);

  async function create(e: FormEvent) {
    e.preventDefault();
    const n = name.trim();
    if (!n) return;
    setBusy(true);
    try {
      const r = await fetch("/api/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: n }),
      });
      if (r.ok) {
        setName("");
        await load();
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <header className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight">
          HopLab <span className="text-brand-coral">Users</span>
        </h1>
        <p className="mt-1 text-black/55 dark:text-white/55">
          Create a user, then run evaluations on the lab kit.
        </p>
      </header>

      <form onSubmit={create} className="flex gap-3 mb-8">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="New user name"
          className="flex-1 rounded-lg border border-black/15 dark:border-white/20 bg-transparent px-4 py-2 outline-none placeholder:text-black/40 dark:placeholder:text-white/40 focus:border-brand-blue"
        />
        <button
          disabled={busy || !name.trim()}
          className="rounded-lg bg-brand-coral text-white px-5 py-2 font-medium hover:opacity-90 disabled:opacity-40 transition-opacity"
        >
          Create
        </button>
      </form>

      <h2 className="text-xs font-semibold uppercase tracking-wider text-black/50 dark:text-white/50 mb-3">
        Users
      </h2>
      <ul className="rounded-xl border border-black/10 dark:border-white/10 overflow-hidden divide-y divide-black/10 dark:divide-white/10">
        {customers.length === 0 && (
          <li className="px-4 py-6 text-black/45 dark:text-white/45 text-sm">No users yet.</li>
        )}
        {customers.map((c) => (
          <li key={c.id}>
            <Link
              href={`/customers/${c.id}`}
              className="flex items-center justify-between px-4 py-3 hover:bg-black/[0.03] dark:hover:bg-white/[0.06] transition-colors"
            >
              <span className="font-medium">{c.name}</span>
              <span className="text-xs text-black/40 dark:text-white/40 font-mono">{c.id}</span>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
