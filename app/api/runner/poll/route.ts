import { NextResponse } from "next/server";
import { findPendingForRunner, saveSession, dequeue } from "@/lib/store";
import { checkRunnerAuth } from "@/lib/auth";
import type { RunnerCommand } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Long-poll: hold the request open while waiting for a command. Keep the
// platform limit comfortably above LONG_POLL_MS so the handler returns first.
export const maxDuration = 35;

const LONG_POLL_MS = 25_000; // hold the request up to ~25s before returning noop
const CHECK_EVERY_MS = 500; // re-check the Blob queue at this cadence

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Claim the next pending command (mutating session state), or null if none. */
async function claimNext(): Promise<RunnerCommand | null> {
  const pending = await findPendingForRunner();
  if (!pending) return null;

  if (pending.status === "pending_start") {
    pending.status = "recording";
    pending.progress = "Recording (technician driving MR4)...";
    await saveSession(pending);
    await dequeue(pending.id);
    return { type: "start", session_id: pending.id, device: pending.device };
  }

  if (pending.status === "pending_stop") {
    pending.status = "exporting";
    pending.progress = "Driving MR4 Export -> CSV...";
    await saveSession(pending);
    await dequeue(pending.id);
    return { type: "stop", session_id: pending.id };
  }

  // Stale queue entry (session moved past pending_*): clean it up.
  await dequeue(pending.id);
  return null;
}

export async function GET(req: Request) {
  const authErr = checkRunnerAuth(req);
  if (authErr) return authErr;

  const deadline = Date.now() + LONG_POLL_MS;
  try {
    do {
      const cmd = await claimNext();
      if (cmd) return NextResponse.json(cmd);
      if (req.signal.aborted) break; // runner disconnected — stop early
      await sleep(CHECK_EVERY_MS);
    } while (Date.now() < deadline);

    const noop: RunnerCommand = { type: "noop" };
    return NextResponse.json(noop);
  } catch (e) {
    console.error("[runner/poll] handler crashed", e);
    const msg = e instanceof Error ? e.message : String(e);
    const stk = e instanceof Error ? e.stack : undefined;
    return NextResponse.json(
      { error: "poll handler crashed", message: msg, stack: stk?.slice(0, 1200) },
      { status: 500 }
    );
  }
}
