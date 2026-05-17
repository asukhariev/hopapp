import { NextResponse } from "next/server";
import { listSessions } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const sessions = await listSessions(50);
  return NextResponse.json({ sessions });
}
