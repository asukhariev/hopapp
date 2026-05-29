import { NextResponse } from "next/server";
import { requestMr4Link } from "@/lib/store";
import { intendedMr4SubjectName } from "@/lib/mr4";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST /api/customers/:id/mr4-link — queue a "create & link this subject in MR4"
// job. The lab runner claims pending links, drives MR4, and posts proof back.
export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const customer = await requestMr4Link(id);
  if (!customer) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({
    customer,
    subject_name: intendedMr4SubjectName(customer.name, customer.mr4_code),
  });
}
