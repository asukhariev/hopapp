import { notFound } from "next/navigation";
import { getCustomer, listEvaluationTypes } from "@/lib/store";
import { Breadcrumbs } from "@/components/breadcrumbs";
import PatientWorkspace from "./patient-workspace";

export const dynamic = "force-dynamic";

export default async function CustomerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [customer, types] = await Promise.all([getCustomer(id), listEvaluationTypes()]);
  if (!customer) notFound();

  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <Breadcrumbs items={[{ label: "Users", href: "/" }, { label: customer.name }]} />
      <h1 className="mb-8 text-2xl font-semibold">{customer.name}</h1>

      <PatientWorkspace customer={customer} types={types} />
    </main>
  );
}
