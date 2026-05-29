import { NextResponse } from "next/server";
import { claimNextRunnerStep, claimNextSubjectJob } from "@/lib/store";
import { checkRunnerAuth } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Long-poll: hold the request open while waiting for a job. Keep the platform
// limit comfortably above LONG_POLL_MS so the handler returns first.
export const maxDuration = 35;

const LONG_POLL_MS = 25_000; // hold up to ~25s before returning noop
const CHECK_EVERY_MS = 500; // re-check the DB at this cadence (strongly consistent)

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function GET(req: Request) {
  const authErr = checkRunnerAuth(req);
  if (authErr) return authErr;

  const deadline = Date.now() + LONG_POLL_MS;
  try {
    do {
      // Subject jobs (find/create/select) take priority — they're quick and gate the UI.
      const subj = await claimNextSubjectJob();
      if (subj.type !== "noop") return NextResponse.json(subj);
      const job = await claimNextRunnerStep();
      if (job.type !== "noop") return NextResponse.json(job);
      if (req.signal.aborted) break; // runner disconnected — stop early
      await sleep(CHECK_EVERY_MS);
    } while (Date.now() < deadline);

    return NextResponse.json({ type: "noop" });
  } catch (e) {
    console.error("[runner/poll] handler crashed", e);
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      { error: "poll handler crashed", message: msg },
      { status: 500 }
    );
  }
}
