import { NextResponse } from "next/server";
import { getCustomer, listEvaluations } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const customer = await getCustomer(id);
  if (!customer) return NextResponse.json({ error: "not found" }, { status: 404 });
  const evaluations = await listEvaluations(id);
  return NextResponse.json({ customer, evaluations });
}
