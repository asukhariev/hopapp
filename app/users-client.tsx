"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import type { Customer } from "@/lib/types";

const PAGE = 20;

async function fetchCustomers(offset: number): Promise<Customer[]> {
  const r = await fetch(`/api/customers?limit=${PAGE}&offset=${offset}`, { cache: "no-store" });
  if (!r.ok) throw new Error("failed to load users");
  return (await r.json()).customers ?? [];
}

export default function UsersClient() {
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteQuery({
    queryKey: ["customers"],
    queryFn: ({ pageParam }) => fetchCustomers(pageParam),
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) =>
      lastPage.length < PAGE ? undefined : allPages.length * PAGE,
  });

  const customers = data?.pages.flat() ?? [];

  const sentinelRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !hasNextPage) return;
    const obs = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && !isFetchingNextPage) fetchNextPage();
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

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
        await qc.invalidateQueries({ queryKey: ["customers"] });
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
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
      <div ref={sentinelRef} className="h-px" />
      {isFetchingNextPage && (
        <p className="text-center text-sm text-black/40 dark:text-white/40 mt-4">Loading…</p>
      )}
    </>
  );
}
