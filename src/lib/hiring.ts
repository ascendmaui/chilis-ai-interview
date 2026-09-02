import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import { getSql } from "@/lib/db";
import { normalizeScorecard } from "@/lib/score";
import type {
  Candidate,
  FloorAnswer,
  InterviewRecord,
  InterviewStatus,
  PipelineStatus,
  RoleSlug,
  Scorecard,
  TranscriptLine,
} from "@/lib/types";

const PIPELINES: PipelineStatus[] = [
  "reviewing",
  "floor_invite",
  "offer",
  "passed",
];
const STATUSES: InterviewStatus[] = [
  "applied",
  "in_progress",
  "completed",
  "abandoned",
];
const SLUGS: RoleSlug[] = [
  "server",
  "host",
  "bartender",
  "line-cook",
  "togo",
  "shift-manager",
];

type ApplicationRow = {
  id: string;
  applicant_user_id: string | null;
  role_slug: string;
  status: string;
  pipeline_status: string;
  candidate_json: string;
  transcript_json: string;
  floor_answers_json: string;
  scorecard_json: string | null;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
  duration_sec: number | null;
  demo: boolean | string | number;
};

function parseJson<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function asBool(v: boolean | string | number | null | undefined): boolean {
  return v === true || v === "t" || v === "true" || v === 1 || v === "1";
}

function rowToRecord(row: ApplicationRow): InterviewRecord {
  const candidate = parseJson<Candidate>(row.candidate_json, {
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    yearsExperience: "",
    availability: [],
    nightsWeekends: false,
    consent: true,
  });
  const floorAnswers = parseJson<FloorAnswer[]>(row.floor_answers_json, []);
  const scoreRaw = parseJson<Scorecard | null>(row.scorecard_json, null);
  const roleSlug = SLUGS.includes(row.role_slug as RoleSlug)
    ? (row.role_slug as RoleSlug)
    : "server";
  const status = STATUSES.includes(row.status as InterviewStatus)
    ? (row.status as InterviewStatus)
    : "applied";
  const pipelineStatus = PIPELINES.includes(row.pipeline_status as PipelineStatus)
    ? (row.pipeline_status as PipelineStatus)
    : "reviewing";

  return {
    id: row.id,
    roleSlug,
    status,
    pipelineStatus,
    applicantUserId: row.applicant_user_id ?? undefined,
    candidate,
    createdAt: row.created_at,
    startedAt: row.started_at ?? undefined,
    completedAt: row.completed_at ?? undefined,
    durationSec: row.duration_sec ?? undefined,
    transcript: parseJson<TranscriptLine[]>(row.transcript_json, []),
    floorAnswers,
    scorecard: scoreRaw ? normalizeScorecard(scoreRaw, floorAnswers) : undefined,
    demo: asBool(row.demo),
    sentToManager: true,
  };
}

export type ApplicationPayload = {
  id: string;
  roleSlug: RoleSlug;
  status: InterviewStatus;
  pipelineStatus?: PipelineStatus;
  candidate: Candidate;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  durationSec?: number;
  transcript: TranscriptLine[];
  floorAnswers: FloorAnswer[];
  scorecard?: Scorecard;
  demo?: boolean;
};

async function upsertApplication(
  sql: Awaited<ReturnType<typeof getSql>>,
  data: ApplicationPayload,
  applicantUserId?: string | null,
) {
  const pipeline = data.pipelineStatus ?? "reviewing";
  const scoreJson = data.scorecard ? JSON.stringify(data.scorecard) : null;
  await sql`
    insert into applications (
      id, applicant_user_id, role_slug, status, pipeline_status,
      candidate_json, transcript_json, floor_answers_json, scorecard_json,
      created_at, started_at, completed_at, duration_sec, demo
    ) values (
      ${data.id},
      ${applicantUserId ?? null},
      ${data.roleSlug},
      ${data.status},
      ${pipeline},
      ${JSON.stringify(data.candidate)},
      ${JSON.stringify(data.transcript.slice(-80))},
      ${JSON.stringify(data.floorAnswers)},
      ${scoreJson},
      ${data.createdAt},
      ${data.startedAt ?? null},
      ${data.completedAt ?? null},
      ${data.durationSec ?? null},
      ${Boolean(data.demo)}
    )
    on conflict (id) do update set
      applicant_user_id = coalesce(applications.applicant_user_id, excluded.applicant_user_id),
      status = excluded.status,
      pipeline_status = excluded.pipeline_status,
      candidate_json = excluded.candidate_json,
      transcript_json = excluded.transcript_json,
      floor_answers_json = excluded.floor_answers_json,
      scorecard_json = excluded.scorecard_json,
      started_at = excluded.started_at,
      completed_at = excluded.completed_at,
      duration_sec = excluded.duration_sec
  `;
}

/** Public intake — completed interviews land on the GM board without requiring an account. */
export const sendToManager = createServerFn({ method: "POST" })
  .validator((input: ApplicationPayload) => input)
  .handler(async ({ data }) => {
    try {
      const sql = await getSql();
      await upsertApplication(sql, {
        ...data,
        status: data.status || "completed",
        pipelineStatus: data.pipelineStatus ?? "reviewing",
      });
      return { ok: true as const };
    } catch (err) {
      console.error("[hiring] sendToManager failed:", err);
      return { ok: false as const };
    }
  });

export const openManagerBoard = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { displayName?: string | null; email?: string | null }) => input)
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    await sql`
      insert into profiles (user_id, display_name, email, is_manager)
      values (
        ${context.userId},
        ${data.displayName ?? null},
        ${data.email ?? null},
        true
      )
      on conflict (user_id) do update set
        display_name = coalesce(excluded.display_name, profiles.display_name),
        email = coalesce(excluded.email, profiles.email),
        is_manager = true
    `;
    const rows = await sql<ApplicationRow>`
      select * from applications order by created_at desc
    `;
    return { ok: true as const, interviews: rows.map(rowToRecord) };
  });

export const openApplicantPortal = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(
    (input: {
      displayName?: string | null;
      email?: string | null;
      payloads?: ApplicationPayload[];
    }) => input,
  )
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const email = data.email?.trim().toLowerCase() || null;
    await sql`
      insert into profiles (user_id, display_name, email, is_manager)
      values (
        ${context.userId},
        ${data.displayName ?? null},
        ${email},
        false
      )
      on conflict (user_id) do update set
        display_name = coalesce(excluded.display_name, profiles.display_name),
        email = coalesce(excluded.email, profiles.email),
        is_manager = profiles.is_manager or excluded.is_manager
    `;

    for (const payload of data.payloads ?? []) {
      await upsertApplication(sql, payload, context.userId);
    }

    if (email) {
      await sql`
        update applications
        set applicant_user_id = ${context.userId}
        where applicant_user_id is null
          and lower(candidate_json::text) like ${"%" + email + "%"}
      `;
    }

    const rows = await sql<ApplicationRow>`
      select * from applications
      where applicant_user_id = ${context.userId}
      order by created_at desc
    `;
    return { ok: true as const, interviews: rows.map(rowToRecord) };
  });

export const setPipelineStatus = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { id: string; pipelineStatus: PipelineStatus }) => input)
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const me = await sql<{ is_manager: boolean | string }>`
      select is_manager from profiles where user_id = ${context.userId}
    `;
    if (!asBool(me[0]?.is_manager)) {
      return { ok: false as const, error: "Manager access required" };
    }
    if (!PIPELINES.includes(data.pipelineStatus)) {
      return { ok: false as const, error: "Invalid status" };
    }
    await sql`
      update applications
      set pipeline_status = ${data.pipelineStatus}
      where id = ${data.id}
    `;
    return { ok: true as const };
  });
