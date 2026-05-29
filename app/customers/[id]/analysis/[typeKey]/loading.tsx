import { Skeleton } from "@/components/skeleton";

export default function Loading() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <Skeleton className="h-4 w-16" />
      <div className="mt-3 mb-8 flex items-center justify-between gap-4">
        <Skeleton className="h-8 w-64 max-w-[60%]" />
        <Skeleton className="h-10 w-36 rounded-lg" />
      </div>

      <Skeleton className="h-3 w-24 mb-3" />
      <div className="space-y-3 mb-10">
        {Array.from({ length: 2 }).map((_, i) => (
          <Skeleton key={i} className="h-16 rounded-xl" />
        ))}
      </div>

      <Skeleton className="h-3 w-24 mb-3" />
      <Skeleton className="h-16 rounded-xl" />
    </main>
  );
}
