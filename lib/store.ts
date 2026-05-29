import { neon } from "@neondatabase/serverless";
import { nanoid } from "nanoid";
import type {
  Customer,
  Evaluation,
  EvaluationDetail,
  EvaluationStep,
  FileRow,
  RunnerJob,
} from "./types";

const sql = neon(process.env.DATABASE_URL!);

// ── Customers ────────────────────────────────────────────────────────────────
export async function createCustomer(name: string, externalRef?: string): Promise<Customer> {
  const id = nanoid(12);
  const rows = (await sql`
    insert into customers (id, name, external_ref)
    values (${id}, ${name}, ${externalRef ?? null})
    returning *`) as Customer[];
  return rows[0];
}

export async function listCustomers(limit = 200): Promise<Customer[]> {
  return (await sql`
    select * from customers order by created_at desc limit ${limit}`) as Customer[];
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
