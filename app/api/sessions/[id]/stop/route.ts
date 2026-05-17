import { NextResponse } from "next/server";
import { getSession, saveSession } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;
  const s = await getSession(id);
  if (!s) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (s.status === "done" || s.status === "failed") {
    return NextResponse.json({ error: "already finished" }, { status: 400 });
  }
  s.status = "pending_stop";
  s.progress = "Stop requested. Waiting for runner to export...";
  await saveSession(s);
  return NextResponse.json(s);
}
