import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { getQueryClient } from "@/lib/query-client";
import { listScreenshots } from "@/lib/store";
import ScreenshotsClient from "./screenshots-client";

export const dynamic = "force-dynamic";

const PAGE = 12;

export default async function ScreenshotsPage() {
  const queryClient = getQueryClient();
  await queryClient.prefetchInfiniteQuery({
    queryKey: ["screenshots"],
    queryFn: ({ pageParam }) => listScreenshots(PAGE, pageParam as number),
    initialPageParam: 0,
  });

  return (
    <main className="mx-auto max-w-5xl px-6 py-12">
      <header className="mb-8">
        <h1 className="text-2xl font-semibold">Workflow reference screenshots</h1>
        <p className="mt-1 text-black/55 dark:text-white/55">
          One-time captures of each MR4 flow step — for revision and comparing against future
          software versions.
        </p>
      </header>

      <HydrationBoundary state={dehydrate(queryClient)}>
        <ScreenshotsClient />
      </HydrationBoundary>
    </main>
  );
}
