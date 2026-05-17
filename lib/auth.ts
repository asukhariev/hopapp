/**
 * Runner authentication — shared secret in Authorization: Bearer header.
 * Set RUNNER_API_KEY in Vercel env and pass the same value to the runner.
 */
import { NextResponse } from "next/server";

export function checkRunnerAuth(req: Request): NextResponse | null {
  const expected = process.env.RUNNER_API_KEY;
  if (!expected) {
    // For v0 with no key set, allow anonymous so demos work. Lock down for prod.
    return null;
  }
  const got = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (got !== expected) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  return null;
}
