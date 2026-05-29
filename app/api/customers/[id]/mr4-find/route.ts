import { NextResponse } from "next/server";
import { requestMr4Find } from "@/lib/store";
import { intendedMr4SubjectName } from "@/lib/mr4";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST /api/customers/:id/mr4-find — queue a live "is this subject in MR4?"
// check. The lab runner reads MR4's subject store and matches our code, then
// reports linked / not_found. No-op (returns current state) if already linked.
export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const customer = await requestMr4Find(id);
  if (!customer) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({
    customer,
    subject_name: intendedMr4SubjectName(customer.name, customer.mr4_code),
  });
}
