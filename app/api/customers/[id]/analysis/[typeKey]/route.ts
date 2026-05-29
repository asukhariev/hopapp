import { NextResponse } from "next/server";
import { getAnalysisView } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string; typeKey: string }> }
) {
  const { id, typeKey } = await ctx.params;
  const view = await getAnalysisView(id, typeKey);
  if (!view) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json(view);
}
