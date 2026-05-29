-- HopLab schema (Neon Postgres). Source of truth for our slice; link to the
-- client's dashboard later via external_ref. Files live in Blob; everything
-- else (state + command signaling) lives here for strong read-after-write.

-- ── Customers (the "users" lab staff create) ────────────────────────────────
create table if not exists customers (
  id           text primary key,                 -- nanoid
  name         text not null,
  external_ref text,                              -- their dashboard id, later
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- MR4 Subject link: each customer maps to a Noraxon MR4 "Subject" whose display
-- name embeds a short unique code (mr4_code) so we can match it back to this row.
-- Matching happens in MR4's UI type-ahead, not against MR4's internal ids.
alter table customers add column if not exists mr4_code         text;        -- 6 hex, unique; embedded in the MR4 subject name
alter table customers add column if not exists mr4_subject_name text;        -- exact "first name" string written into MR4 (set on link)
alter table customers add column if not exists mr4_linked_at    timestamptz; -- when the subject was confirmed/created in MR4
alter table customers add column if not exists mr4_proof_url    text;        -- screenshot proving the subject exists in MR4
alter table customers add column if not exists mr4_link_status  text;        -- null | checking | not_found | linking | selecting | failed
alter table customers add column if not exists mr4_link_error   text;
alter table customers add column if not exists mr4_claimed_at   timestamptz; -- runner claim (prevents double-processing a pending job)
create unique index if not exists idx_customers_mr4_code on customers(mr4_code);

-- ── Template: evaluation types + step catalog + the ordered-steps join ───────
create table if not exists evaluation_types (
  id         text primary key,
  key        text unique not null,               -- e.g. 'default'
  name       text not null,
  created_at timestamptz not null default now()
);

create table if not exists step_definitions (
  id         text primary key,
  key        text unique not null,               -- e.g. 'mr4_export'
  name       text not null,
  kind       text not null,                       -- lab_runner | manual | http
  config     jsonb not null default '{}'::jsonb,  -- per-kind: action, device, endpoint…
  created_at timestamptz not null default now()
);

-- the recipe: which steps, in what order, with what instructions
create table if not exists evaluation_type_steps (
  evaluation_type_id text not null references evaluation_types(id) on delete cascade,
  step_definition_id text not null references step_definitions(id) on delete restrict,
  seq                int  not null,
  instructions       text,
  primary key (evaluation_type_id, seq)
);

-- ── Instance: a customer's evaluation + its runtime steps ────────────────────
create table if not exists evaluations (
  id                 text primary key,            -- nanoid
  customer_id        text not null references customers(id) on delete cascade,
  evaluation_type_id text not null references evaluation_types(id) on delete restrict,
  status             text not null default 'in_progress',  -- in_progress | done | failed
  external_ref       text,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

-- the execution unit (replaces the old "sessions"); one row per step per run
create table if not exists evaluation_steps (
  id                 text primary key,            -- nanoid
  evaluation_id      text not null references evaluations(id) on delete cascade,
  step_definition_id text not null references step_definitions(id) on delete restrict,
  seq                int  not null,
  kind               text not null,               -- denormalized so the runner can query directly
  config             jsonb not null default '{}'::jsonb,
  instructions       text,
  status             text not null default 'pending',  -- pending | active | done | failed | skipped
  progress           text,
  result             jsonb,
  claimed_at         timestamptz,                 -- lab_runner: set on pickup to prevent double-run
  started_at         timestamptz,
  finished_at        timestamptz,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);
create index if not exists idx_eval_steps_eval   on evaluation_steps(evaluation_id, seq);
-- the runner's pickup query: active + lab_runner + unclaimed
create index if not exists idx_eval_steps_runner on evaluation_steps(status, kind, claimed_at);

-- ── Files (stored in Blob; row here links them to step/eval/customer) ────────
create table if not exists files (
  id                 text primary key,
  evaluation_step_id text not null references evaluation_steps(id) on delete cascade,
  evaluation_id      text not null references evaluations(id) on delete cascade,
  customer_id        text not null references customers(id) on delete cascade,
  url                text not null,
  name               text not null,
  size_bytes         bigint,
  created_at         timestamptz not null default now()
);
create index if not exists idx_files_customer on files(customer_id, created_at desc);

-- ── Workflow screenshots (captures from each automation step; bytes in Blob) ──
create table if not exists screenshots (
  id                 text primary key,
  label              text not null,
  url                text not null,
  width              int,
  height             int,
  evaluation_step_id text references evaluation_steps(id) on delete set null,
  created_at         timestamptz not null default now()
);
create index if not exists idx_screenshots_created on screenshots(created_at desc);

-- ── Seed: the two fixed video analyses, each a single MR4-export step ─────────
insert into step_definitions (id, key, name, kind, config)
values ('mr4_export', 'mr4_export', 'MR4 Export', 'lab_runner',
        '{"action":"mr4_export","device":"emg"}'::jsonb)
on conflict (key) do nothing;

insert into evaluation_types (id, key, name) values
  ('gait-left',    'gait-left',    'Video Gait Analysis — Left Side'),
  ('running-left', 'running-left', 'Video Running Analysis — Left Side First')
on conflict (key) do nothing;

insert into evaluation_type_steps (evaluation_type_id, step_definition_id, seq, instructions) values
  ('gait-left',    'mr4_export', 1, 'Run the MR4 export for the left-side gait recording and upload it.'),
  ('running-left', 'mr4_export', 1, 'Run the MR4 export for the left-side-first running recording and upload it.')
on conflict (evaluation_type_id, seq) do nothing;
