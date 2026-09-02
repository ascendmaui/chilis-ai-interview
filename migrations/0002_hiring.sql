create table if not exists profiles (
  user_id text primary key,
  display_name text,
  email text,
  is_manager boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists applications (
  id text primary key,
  applicant_user_id text,
  role_slug text not null,
  status text not null,
  pipeline_status text not null default 'reviewing',
  candidate_json text not null,
  transcript_json text not null default '[]',
  floor_answers_json text not null default '[]',
  scorecard_json text,
  created_at timestamptz not null default now(),
  started_at timestamptz,
  completed_at timestamptz,
  duration_sec integer,
  demo boolean not null default false
);

create index if not exists applications_applicant_idx on applications (applicant_user_id);
create index if not exists applications_pipeline_idx on applications (pipeline_status);
create index if not exists applications_created_idx on applications (created_at desc);
