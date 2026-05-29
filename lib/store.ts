import { neon } from "@neondatabase/serverless";
import { nanoid } from "nanoid";
import { randomBytes } from "node:crypto";
import { intendedMr4SubjectName } from "./mr4";
import type {
  Customer,
  Evaluation,
  EvaluationDetail,
  EvaluationStep,
  FileRow,
  RunnerJob,
  EvaluationType,
  AnalysisView,
  Screenshot,
} from "./types";

const sql = neon(process.env.DATABASE_URL!);

// ── Customers ────────────────────────────────────────────────────────────────
/** Short, unique-per-customer code embedded in the MR4 subject name (6 hex). */
function genMr4Code(): string {
  return randomBytes(3).toString("hex"); // e.g. "3f9c1a"
}

export async function createCustomer(name: string, externalRef?: string): Promise<Customer> {
  // Allocate a customer with a unique mr4_code; retry on the (rare) collision.
  for (let attempt = 0; attempt < 6; attempt++) {
    const id = nanoid(12);
    const code = genMr4Code();
    try {
      const rows = (await sql`
        insert into customers (id, name, external_ref, mr4_code)
        values (${id}, ${name}, ${externalRef ?? null}, ${code})
        returning *`) as Customer[];
      return rows[0];
    } catch (e) {
      // 23505 = unique_violation (id or mr4_code clash) → regenerate and retry
      if (attempt < 5 && (e as { code?: string })?.code === "23505") continue;
      throw e;
    }
  }
  throw new Error("could not allocate a unique customer id / mr4_code");
}

/** Make sure a customer has an mr4_code (covers rows created before the column). */
async function ensureMr4Code(customerId: string): Promise<void> {
  for (let attempt = 0; attempt < 6; attempt++) {
    try {
      await sql`
        update customers set mr4_code = ${genMr4Code()}, updated_at = now()
        where id = ${customerId} and mr4_code is null`;
      return;
    } catch (e) {
      if (attempt < 5 && (e as { code?: string })?.code === "23505") continue;
      throw e;
    }
  }
}

/** Queue a live "is this subject in MR4?" check — the runner reads MR4's store. */
export async function requestMr4Find(customerId: string): Promise<Customer | null> {
  await ensureMr4Code(customerId);
  const rows = (await sql`
    update customers
    set mr4_link_status = 'checking', mr4_link_error = null, mr4_claimed_at = null, updated_at = now()
    where id = ${customerId} and mr4_linked_at is null
    returning *`) as Customer[];
  if (rows[0]) return rows[0];
  // Already linked (or missing) — return current row unchanged.
  return getCustomer(customerId);
}

/** Queue a "create & link this subject in MR4" job — the runner drives the UI. */
export async function requestMr4Link(customerId: string): Promise<Customer | null> {
  await ensureMr4Code(customerId);
  const rows = (await sql`
    update customers
    set mr4_link_status = 'linking', mr4_link_error = null, mr4_claimed_at = null, updated_at = now()
    where id = ${customerId}
    returning *`) as Customer[];
  return rows[0] ?? null;
}

/** Runner job for a customer's pending MR4 work (find / create / select). */
export type SubjectJob =
  | { type: "noop" }
  | {
      type: "subject_job";
      kind: "find" | "create" | "select";
      customer_id: string;
      name: string;
      mr4_code: string | null;
      subject_name: string;
    };

/** Atomically claim the next pending customer subject-job (or noop). */
export async function claimNextSubjectJob(): Promise<SubjectJob> {
  const rows = (await sql`
    update customers
    set mr4_claimed_at = now(), updated_at = now()
    where id = (
      select id from customers
      where mr4_link_status in ('checking', 'linking', 'selecting') and mr4_claimed_at is null
      order by updated_at
      limit 1
      for update skip locked
    )
    returning id, name, mr4_code, mr4_subject_name, mr4_link_status`) as {
    id: string;
    name: string;
    mr4_code: string | null;
    mr4_subject_name: string | null;
    mr4_link_status: string;
  }[];
  const c = rows[0];
  if (!c) return { type: "noop" };
  const kind =
    c.mr4_link_status === "linking" ? "create" : c.mr4_link_status === "selecting" ? "select" : "find";
  return {
    type: "subject_job",
    kind,
    customer_id: c.id,
    name: c.name,
    mr4_code: c.mr4_code,
    subject_name: c.mr4_subject_name ?? intendedMr4SubjectName(c.name, c.mr4_code),
  };
}

/** Runner: the find completed and the subject is not in MR4 yet. */
export async function markCustomerNotFound(customerId: string): Promise<void> {
  await sql`
    update customers
    set mr4_link_status = 'not_found', mr4_link_error = null, mr4_claimed_at = null, updated_at = now()
    where id = ${customerId} and mr4_linked_at is null`;
}

/** Runner: record that the subject now exists in MR4 (with proof). */
export async function markCustomerLinked(
  customerId: string,
  opts: { subjectName: string; proofUrl?: string }
): Promise<void> {
  await sql`
    update customers
    set mr4_linked_at = now(), mr4_subject_name = ${opts.subjectName},
        mr4_proof_url = ${opts.proofUrl ?? null},
        mr4_link_status = null, mr4_link_error = null, mr4_claimed_at = null, updated_at = now()
    where id = ${customerId}`;
}

/** Runner: the MR4 link attempt failed. */
export async function failCustomerLink(customerId: string, error: string): Promise<void> {
  await sql`
    update customers
    set mr4_link_status = 'failed', mr4_link_error = ${error}, mr4_claimed_at = null, updated_at = now()
    where id = ${customerId}`;
}

export async function listCustomers(limit = 20, offset = 0): Promise<Customer[]> {
  return (await sql`
    select * from customers order by created_at desc
    limit ${limit} offset ${offset}`) as Customer[];
}

export async function getCustomer(id: string): Promise<Customer | null> {
  const rows = (await sql`select * from customers where id = ${id}`) as Customer[];
  return rows[0] ?? null;
}

// ── Evaluations ───────────────────────────────────────────────────────────────
/**
 * Create an evaluation for a customer from a type's step recipe. Snapshots the
 * template steps into evaluation_steps and activates the first one.
 */
export async function createEvaluation(
  customerId: string,
  typeKey = "default"
): Promise<Evaluation> {
  const typeRows = (await sql`
    select id from evaluation_types where key = ${typeKey}`) as { id: string }[];
  const type = typeRows[0];
  if (!type) throw new Error(`evaluation type '${typeKey}' not found`);

  const template = (await sql`
    select ets.step_definition_id, ets.seq, ets.instructions, d.kind, d.config
    from evaluation_type_steps ets
    join step_definitions d on d.id = ets.step_definition_id
    where ets.evaluation_type_id = ${type.id}
    order by ets.seq`) as {
    step_definition_id: string;
    seq: number;
    instructions: string | null;
    kind: string;
    config: Record<string, unknown>;
  }[];

  const evaluationId = nanoid(12);
  const queries = [
    sql`insert into evaluations (id, customer_id, evaluation_type_id, status)
        values (${evaluationId}, ${customerId}, ${type.id}, 'in_progress')`,
  ];
  template.forEach((s, i) => {
    queries.push(sql`
      insert into evaluation_steps
        (id, evaluation_id, step_definition_id, seq, kind, config, instructions, status)
      values (${nanoid(12)}, ${evaluationId}, ${s.step_definition_id}, ${s.seq},
              ${s.kind}, ${JSON.stringify(s.config ?? {})}::jsonb, ${s.instructions},
              ${i === 0 ? "active" : "pending"})`);
  });
  await sql.transaction(queries);

  const rows = (await sql`select * from evaluations where id = ${evaluationId}`) as Evaluation[];
  return rows[0];
}

export async function listEvaluations(customerId: string): Promise<Evaluation[]> {
  return (await sql`
    select * from evaluations where customer_id = ${customerId}
    order by created_at desc`) as Evaluation[];
}

export async function getEvaluation(id: string): Promise<EvaluationDetail | null> {
  const evRows = (await sql`select * from evaluations where id = ${id}`) as Evaluation[];
  const evaluation = evRows[0];
  if (!evaluation) return null;
  const steps = (await sql`
    select * from evaluation_steps where evaluation_id = ${id} order by seq`) as EvaluationStep[];
  const files = (await sql`
    select * from files where evaluation_id = ${id} order by created_at desc`) as FileRow[];
  return { evaluation, steps, files };
}

// ── Runner: claim a job + report back ─────────────────────────────────────────
/** Atomically claim the next active, unclaimed lab_runner step (or noop). */
export async function claimNextRunnerStep(): Promise<RunnerJob> {
  const rows = (await sql`
    update evaluation_steps
    set claimed_at = now(), started_at = coalesce(started_at, now()), updated_at = now()
    where id = (
      select id from evaluation_steps
      where status = 'active' and kind = 'lab_runner' and claimed_at is null
      order by created_at
      limit 1
      for update skip locked
    )
    returning id, evaluation_id, config, instructions`) as {
    id: string;
    evaluation_id: string;
    config: Record<string, unknown> | null;
    instructions: string | null;
  }[];
  const step = rows[0];
  if (!step) return { type: "noop" };
  const config = step.config ?? {};
  return {
    type: "step",
    step_id: step.id,
    evaluation_id: step.evaluation_id,
    action: (config.action as string) ?? "unknown",
    config,
    instructions: step.instructions,
  };
}

export async function setStepProgress(stepId: string, progress: string): Promise<void> {
  await sql`
    update evaluation_steps set progress = ${progress}, updated_at = now() where id = ${stepId}`;
}

/** Mark a step done, attach result, and activate the next step (or finish the evaluation). */
export async function completeStep(
  stepId: string,
  opts: { result?: Record<string, unknown>; progress?: string } = {}
): Promise<void> {
  const doneRows = (await sql`
    update evaluation_steps
    set status = 'done', progress = ${opts.progress ?? "Done"},
        result = ${opts.result ? JSON.stringify(opts.result) : null}::jsonb,
        finished_at = now(), updated_at = now()
    where id = ${stepId}
    returning evaluation_id`) as { evaluation_id: string }[];
  const done = doneRows[0];
  if (!done) return;

  const nextRows = (await sql`
    update evaluation_steps
    set status = 'active', updated_at = now()
    where id = (
      select id from evaluation_steps
      where evaluation_id = ${done.evaluation_id} and status = 'pending'
      order by seq limit 1
    )
    returning id`) as { id: string }[];

  if (nextRows.length === 0) {
    await sql`
      update evaluations set status = 'done', updated_at = now()
      where id = ${done.evaluation_id}`;
  }
}

export async function failStep(stepId: string, error: string): Promise<void> {
  const rows = (await sql`
    update evaluation_steps
    set status = 'failed', progress = ${error},
        result = jsonb_build_object('error', ${error}::text),
        finished_at = now(), updated_at = now()
    where id = ${stepId}
    returning evaluation_id`) as { evaluation_id: string }[];
  if (rows[0]) {
    await sql`
      update evaluations set status = 'failed', updated_at = now()
      where id = ${rows[0].evaluation_id}`;
  }
}

export async function getStep(stepId: string): Promise<EvaluationStep | null> {
  const rows = (await sql`
    select * from evaluation_steps where id = ${stepId}`) as EvaluationStep[];
  return rows[0] ?? null;
}

// ── Files (rows here; bytes live in Vercel Blob) ──────────────────────────────
export async function addFile(args: {
  evaluationStepId: string;
  url: string;
  name: string;
  sizeBytes?: number;
}): Promise<FileRow> {
  const ctx = (await sql`
    select es.evaluation_id, ev.customer_id
    from evaluation_steps es
    join evaluations ev on ev.id = es.evaluation_id
    where es.id = ${args.evaluationStepId}`) as {
    evaluation_id: string;
    customer_id: string;
  }[];
  if (!ctx[0]) throw new Error("evaluation_step not found");
  const id = nanoid(12);
  const rows = (await sql`
    insert into files (id, evaluation_step_id, evaluation_id, customer_id, url, name, size_bytes)
    values (${id}, ${args.evaluationStepId}, ${ctx[0].evaluation_id}, ${ctx[0].customer_id},
            ${args.url}, ${args.name}, ${args.sizeBytes ?? null})
    returning *`) as FileRow[];
  return rows[0];
}

// ── Workflow screenshots ──────────────────────────────────────────────────────
export async function createScreenshot(args: {
  label: string;
  url: string;
  width?: number;
  height?: number;
  evaluationStepId?: string;
}): Promise<Screenshot> {
  const id = nanoid(12);
  const rows = (await sql`
    insert into screenshots (id, label, url, width, height, evaluation_step_id)
    values (${id}, ${args.label}, ${args.url}, ${args.width ?? null}, ${args.height ?? null},
            ${args.evaluationStepId ?? null})
    returning *`) as Screenshot[];
  return rows[0];
}

export async function listScreenshots(limit = 20, offset = 0): Promise<Screenshot[]> {
  return (await sql`
    select * from screenshots order by created_at desc
    limit ${limit} offset ${offset}`) as Screenshot[];
}

// ── Analysis types + per-(customer, type) view ────────────────────────────────
export async function listEvaluationTypes(): Promise<EvaluationType[]> {
  return (await sql`select id, key, name from evaluation_types order by name`) as EvaluationType[];
}

/** Latest run of one analysis type for a customer + all files ever saved for it. */
export async function getAnalysisView(
  customerId: string,
  typeKey: string
): Promise<AnalysisView | null> {
  const typeRows = (await sql`
    select id, key, name from evaluation_types where key = ${typeKey}`) as EvaluationType[];
  const type = typeRows[0];
  if (!type) return null;

  const evRows = (await sql`
    select * from evaluations
    where customer_id = ${customerId} and evaluation_type_id = ${type.id}
    order by created_at desc limit 1`) as Evaluation[];

  let latest: AnalysisView["latest"] = null;
  if (evRows[0]) {
    const steps = (await sql`
      select * from evaluation_steps where evaluation_id = ${evRows[0].id} order by seq`) as EvaluationStep[];
    latest = { evaluation: evRows[0], steps };
  }

  const files = (await sql`
    select f.* from files f
    join evaluations e on e.id = f.evaluation_id
    where e.customer_id = ${customerId} and e.evaluation_type_id = ${type.id}
    order by f.created_at desc`) as FileRow[];

  return { type, latest, files };
}
