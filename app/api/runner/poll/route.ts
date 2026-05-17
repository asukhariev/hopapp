import { NextResponse } from "next/server";
import { findPendingForRunner, saveSession, dequeue } from "@/lib/store";
import { checkRunnerAuth } from "@/lib/auth";
import type { RunnerCommand } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const authErr = checkRunnerAuth(req);
  if (authErr) return authErr;

  try {
    const pending = await findPendingForRunner();
    if (!pending) {
      const noop: RunnerCommand = { type: "noop" };
      return NextResponse.json(noop);
    }

    if (pending.status === "pending_start") {
      pending.status = "recording";
      pending.progress = "Recording (technician driving MR4)...";
      await saveSession(pending);
      await dequeue(pending.id);
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
      await dequeue(pending.id);
      const cmd: RunnerCommand = { type: "stop", session_id: pending.id };
      return NextResponse.json(cmd);
    }

    // Stale queue entry (session moved past pending_*): clean it up
    await dequeue(pending.id);
    const stale: RunnerCommand = { type: "noop" };
    return NextResponse.json(stale);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const stk = e instanceof Error ? e.stack : undefined;
    return NextResponse.json(
      { error: "poll handler crashed", message: msg, stack: stk?.slice(0, 1200) },
      { status: 500 }
    );
  }
}
