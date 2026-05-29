import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { notFound } from "next/navigation";
import { getQueryClient } from "@/lib/query-client";
import { getAnalysisView, getCustomer } from "@/lib/store";
import { Breadcrumbs } from "@/components/breadcrumbs";
import AnalysisClient from "./analysis-client";

export const dynamic = "force-dynamic";

export default async function AnalysisPage({
  params,
}: {
  params: Promise<{ id: string; typeKey: string }>;
}) {
  const { id, typeKey } = await params;
  const queryClient = getQueryClient();
  const [customer, view] = await Promise.all([
    getCustomer(id),
    getAnalysisView(id, typeKey),
  ]);
  if (!view) notFound();
  queryClient.setQueryData(["analysis", id, typeKey], view);

  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <Breadcrumbs
        items={[
          { label: "Users", href: "/" },
          { label: customer?.name ?? "User", href: `/customers/${id}` },
          { label: view.type.name },
        ]}
      />
      <HydrationBoundary state={dehydrate(queryClient)}>
        <AnalysisClient id={id} typeKey={typeKey} />
      </HydrationBoundary>
    </main>
  );
}
