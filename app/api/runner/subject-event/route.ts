import { NextResponse } from "next/server";
import { markCustomerLinked, markCustomerNotFound, failCustomerLink, getCustomer } from "@/lib/store";
import { checkRunnerAuth } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type SubjectEventBody = {
  customer_id: string;
  result: "linked" | "not_found" | "failed";
  subject_name?: string;
  proof_url?: string;
  error?: string;
};

// Runner reports the outcome of a find / create / select job for a customer.
export async function POST(req: Request) {
  const authErr = checkRunnerAuth(req);
  if (authErr) return authErr;

  const body = (await req.json().catch(() => ({}))) as SubjectEventBody;
  if (!body.customer_id || !body.result) {
    return NextResponse.json({ error: "customer_id and result required" }, { status: 400 });
  }

  if (body.result === "linked") {
    const c = await getCustomer(body.customer_id);
    await markCustomerLinked(body.customer_id, {
      subjectName: body.subject_name ?? c?.mr4_subject_name ?? c?.name ?? "",
      proofUrl: body.proof_url,
    });
  } else if (body.result === "not_found") {
    await markCustomerNotFound(body.customer_id);
  } else {
    await failCustomerLink(body.customer_id, body.error ?? "MR4 job failed");
  }

  return NextResponse.json(await getCustomer(body.customer_id));
}
