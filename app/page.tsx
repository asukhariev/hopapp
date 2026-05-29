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
    <main className="mx-auto max-w-2xl px-6 py-12 font-sans text-slate-100">
      <header className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight">
          HopLab <span className="text-slate-400 font-normal">/ Users</span>
        </h1>
        <p className="mt-2 text-slate-400">Create a user, then run evaluations on the lab kit.</p>
      </header>

      <form onSubmit={create} className="flex gap-3 mb-8">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="New user name"
          className="flex-1 rounded-lg bg-slate-900 border border-slate-800 px-4 py-2 outline-none focus:border-slate-600"
        />
        <button
          disabled={busy || !name.trim()}
          className="rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 px-5 py-2 font-medium transition-colors"
        >
          Create
        </button>
      </form>

      <h2 className="text-sm uppercase tracking-wider text-slate-400 mb-3">Users</h2>
      <ul className="divide-y divide-slate-800 rounded-lg border border-slate-800 overflow-hidden">
        {customers.length === 0 && (
          <li className="px-4 py-6 text-slate-500 text-sm">No users yet.</li>
        )}
        {customers.map((c) => (
          <li key={c.id}>
            <Link
              href={`/customers/${c.id}`}
              className="flex items-center justify-between px-4 py-3 hover:bg-slate-900/50 transition-colors"
            >
              <span>{c.name}</span>
              <span className="text-xs text-slate-500 font-mono">{c.id}</span>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
