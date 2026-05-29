import { Skeleton } from "@/components/skeleton";

export default function Loading() {
  return (
    <main className="mx-auto max-w-5xl px-6 py-12">
      <Skeleton className="h-4 w-16" />
      <div className="mt-3 mb-8">
        <Skeleton className="h-8 w-80 max-w-full" />
        <Skeleton className="mt-2 h-4 w-[28rem] max-w-full" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="rounded-xl border border-black/10 dark:border-white/10 overflow-hidden"
          >
            <Skeleton className="w-full aspect-video rounded-none" />
            <div className="px-4 py-3">
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="mt-2 h-3 w-1/3" />
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
