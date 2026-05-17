import { NextResponse } from "next/server";
import { findPendingForRunner, saveSession } from "@/lib/store";
import { checkRunnerAuth } from "@/lib/auth";
import type { RunnerCommand } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const authErr = checkRunnerAuth(req);
  if (authErr) return authErr;

  const pending = await findPendingForRunner();
  if (!pending) {
    const noop: RunnerCommand = { type: "noop" };
    return NextResponse.json(noop);
  }

  // Acknowledge: flip status so we don't re-issue the command on next poll
  if (pending.status === "pending_start") {
    pending.status = "recording";
    pending.progress = "Recording (technician driving MR4)...";
    await saveSession(pending);
    const cmd: RunnerCommand = {
      type: "start",
      session_id: pending.id,
      device: pending.device,
    };
    return NextResponse.json(cmd);
  }

  if (pending.status === "pending_stop") {
    pending.status = "exporting";
    pending.progress = "Driving MR4 Export -> CSV...";
    await saveSession(pending);
    const cmd: RunnerCommand = { type: "stop", session_id: pending.id };
    return NextResponse.json(cmd);
  }

  const noop: RunnerCommand = { type: "noop" };
  return NextResponse.json(noop);
}
