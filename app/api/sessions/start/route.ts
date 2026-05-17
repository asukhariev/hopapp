import { NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { saveSession, enqueueStart } from "@/lib/store";
import type { Session } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const device = (body?.device ?? "emg") as Session["device"];
  const now = new Date().toISOString();
  const s: Session = {
    id: nanoid(10),
    device,
    status: "pending_start",
    created_at: now,
    updated_at: now,
    progress: "Waiting for runner to pick up...",
  };
  await saveSession(s);
  await enqueueStart(s.id);
  return NextResponse.json(s);
}
