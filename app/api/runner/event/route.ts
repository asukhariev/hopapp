import { NextResponse } from "next/server";
import { setStepProgress, completeStep, failStep, addFile, getStep } from "@/lib/store";
import { checkRunnerAuth } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type EventBody = {
  step_id: string;
  status?: "progress" | "done" | "failed";
  progress?: string;
  error?: string;
  result?: Record<string, unknown>;
  file?: { url: string; name: string; size_bytes?: number };
};

export async function POST(req: Request) {
  const authErr = checkRunnerAuth(req);
  if (authErr) return authErr;

  const body = (await req.json().catch(() => ({}))) as EventBody;
  if (!body.step_id) {
    return NextResponse.json({ error: "step_id required" }, { status: 400 });
  }

  if (body.file) {
    await addFile({
      evaluationStepId: body.step_id,
      url: body.file.url,
      name: body.file.name,
      sizeBytes: body.file.size_bytes,
    });
  }

  if (body.status === "failed") {
    await failStep(body.step_id, body.error ?? "failed");
  } else if (body.status === "done") {
    await completeStep(body.step_id, { result: body.result, progress: body.progress });
  } else if (body.progress) {
    await setStepProgress(body.step_id, body.progress);
  }

  const step = await getStep(body.step_id);
  return NextResponse.json(step ?? {});
}
