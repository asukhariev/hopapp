"use client";

import { useEffect, useRef } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import type { Screenshot } from "@/lib/types";

const PAGE = 12;

async function fetchScreenshots(offset: number): Promise<Screenshot[]> {
  const r = await fetch(`/api/screenshots?limit=${PAGE}&offset=${offset}`, { cache: "no-store" });
  if (!r.ok) throw new Error("failed to load screenshots");
  return (await r.json()).screenshots ?? [];
}

export default function ScreenshotsClient() {
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteQuery({
    queryKey: ["screenshots"],
    queryFn: ({ pageParam }) => fetchScreenshots(pageParam),
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) =>
      lastPage.length < PAGE ? undefined : allPages.length * PAGE,
  });

  const shots = data?.pages.flat() ?? [];

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

  if (shots.length === 0) {
    return <p className="text-black/45 dark:text-white/45 text-sm">No screenshots saved yet.</p>;
  }

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        {shots.map((s) => (
          <a
            key={s.id}
            href={s.url}
            target="_blank"
            rel="noopener"
            className="block rounded-xl border border-black/10 dark:border-white/10 overflow-hidden hover:border-brand-coral transition-colors"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={s.url}
              alt={s.label}
              className="w-full aspect-video object-cover bg-black/5 dark:bg-white/5"
            />
            <div className="px-4 py-3">
              <div className="font-medium truncate">{s.label}</div>
              <div className="text-xs text-black/40 dark:text-white/40">
                {new Date(s.created_at).toLocaleString()}
                {s.width ? ` · ${s.width}×${s.height}` : ""}
              </div>
            </div>
          </a>
        ))}
      </div>
      <div ref={sentinelRef} className="h-px" />
      {isFetchingNextPage && (
        <p className="text-center text-sm text-black/40 dark:text-white/40 mt-4">Loading…</p>
      )}
    </>
  );
}
