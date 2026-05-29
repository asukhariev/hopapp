import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { getQueryClient } from "@/lib/query-client";
import { listCustomers } from "@/lib/store";
import UsersClient from "./users-client";

export const dynamic = "force-dynamic";

const PAGE = 20;

export default async function Home() {
  const queryClient = getQueryClient();
  await queryClient.prefetchInfiniteQuery({
    queryKey: ["customers"],
    queryFn: ({ pageParam }) => listCustomers(PAGE, pageParam as number),
    initialPageParam: 0,
  });

  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <header className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight">Users</h1>
        <p className="mt-1 text-black/55 dark:text-white/55">
          Create a user, then run evaluations on the lab kit.
        </p>
      </header>

      <HydrationBoundary state={dehydrate(queryClient)}>
        <UsersClient />
      </HydrationBoundary>
    </main>
  );
}
