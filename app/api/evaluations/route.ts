import { NextResponse } from "next/server";
import { createEvaluation } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const customerId = (body?.customer_id ?? "").toString();
  if (!customerId) return NextResponse.json({ error: "customer_id required" }, { status: 400 });
  const evaluation = await createEvaluation(customerId, body?.type_key ?? "default");
  return NextResponse.json(evaluation);
}
