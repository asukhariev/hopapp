import { Skeleton } from "@/components/skeleton";

export default function Loading() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <Skeleton className="h-4 w-16" />
      <Skeleton className="mt-3 mb-8 h-8 w-40" />

      <Skeleton className="h-3 w-20 mb-3" />
      <div className="grid gap-3">
        {Array.from({ length: 2 }).map((_, i) => (
          <Skeleton key={i} className="h-[60px] rounded-xl" />
        ))}
      </div>
    </main>
  );
}
