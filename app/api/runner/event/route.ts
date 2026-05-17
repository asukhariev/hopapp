import { NextResponse } from "next/server";
import { getSession, saveSession } from "@/lib/store";
import { checkRunnerAuth } from "@/lib/auth";
import type { SessionStatus } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type EventBody = {
  session_id: string;
  status?: SessionStatus;
  progress?: string;
  file_url?: string;
  file_name?: string;
  file_size_bytes?: number;
  error?: string;
};

export async function POST(req: Request) {
  const authErr = checkRunnerAuth(req);
  if (authErr) return authErr;

  const body = (await req.json().catch(() => ({}))) as EventBody;
  if (!body.session_id) {
    return NextResponse.json({ error: "session_id required" }, { status: 400 });
  }
  const s = await getSession(body.session_id);
  if (!s) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (body.status) s.status = body.status;
  if (body.progress !== undefined) s.progress = body.progress;
  if (body.file_url) s.file_url = body.file_url;
  if (body.file_name) s.file_name = body.file_name;
  if (body.file_size_bytes !== undefined) s.file_size_bytes = body.file_size_bytes;
  if (body.error) s.error = body.error;
  await saveSession(s);
  return NextResponse.json(s);
}
