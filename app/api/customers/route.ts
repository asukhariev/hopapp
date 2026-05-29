import { NextResponse } from "next/server";
import { listCustomers, createCustomer } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ customers: await listCustomers() });
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const name = (body?.name ?? "").toString().trim();
  if (!name) return NextResponse.json({ error: "name required" }, { status: 400 });
  const customer = await createCustomer(name, body?.external_ref);
  return NextResponse.json(customer);
}
