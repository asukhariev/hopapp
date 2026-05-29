export type StepKind = "lab_runner" | "manual" | "http";

export type StepStatus =
  | "pending" // not reached yet
  | "active" // current step (awaiting pickup or executing)
  | "done"
  | "failed"
  | "skipped";

export type EvaluationStatus = "in_progress" | "done" | "failed";

export type Customer = {
  id: string;
  name: string;
  external_ref: string | null;
  created_at: string;
  updated_at: string;
};

export type Evaluation = {
  id: string;
  customer_id: string;
  evaluation_type_id: string;
  status: EvaluationStatus;
  external_ref: string | null;
  created_at: string;
  updated_at: string;
};

export type EvaluationStep = {
  id: string;
  evaluation_id: string;
  step_definition_id: string;
  seq: number;
  kind: StepKind;
  config: Record<string, unknown>;
  instructions: string | null;
  status: StepStatus;
  progress: string | null;
  result: Record<string, unknown> | null;
  claimed_at: string | null;
  started_at: string | null;
  finished_at: string | null;
  created_at: string;
  updated_at: string;
};

export type FileRow = {
  id: string;
  evaluation_step_id: string;
  evaluation_id: string;
  customer_id: string;
  url: string;
  name: string;
  size_bytes: number | null;
  created_at: string;
};

/** Full view used by the evaluation screen. */
export type EvaluationDetail = {
  evaluation: Evaluation;
  steps: EvaluationStep[];
  files: FileRow[];
};

/** What the runner receives from /api/runner/poll. */
export type RunnerJob =
  | { type: "noop" }
  | {
      type: "step";
      step_id: string;
      evaluation_id: string;
      action: string; // from step config, e.g. "mr4_export"
      config: Record<string, unknown>;
      instructions: string | null;
    };

export const ACTIVE_STEP_STATUS: StepStatus = "active";
export const TERMINAL_STEP_STATUSES: StepStatus[] = ["done", "failed", "skipped"];
export const TERMINAL_EVAL_STATUSES: EvaluationStatus[] = ["done", "failed"];
