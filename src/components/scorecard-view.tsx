import { Link } from "@tanstack/react-router";
import { getRole } from "@/lib/roles";
import type { InterviewRecord, PipelineStatus, Recommendation } from "@/lib/types";
import { PIPELINE_LABEL, REC_LABEL, SCORE_KEYS } from "@/lib/types";
import { cn, formatDuration, relativeTime } from "@/lib/utils";

const REC_TONE: Record<Recommendation, string> = {
  strong_yes: "bg-pepper text-cream",
  yes: "bg-pepper/90 text-cream",
  maybe: "bg-warn text-ink",
  no: "bg-chili text-cream",
};

const PIPE_TONE: Record<PipelineStatus, string> = {
  reviewing: "bg-elevated text-fg",
  floor_invite: "bg-pepper text-cream",
  offer: "bg-ink text-cream",
  passed: "bg-chili text-cream",
};

export function RecBadge({ rec }: { rec: Recommendation }) {
  return (
    <span
      className={cn(
        "inline-flex min-h-7 items-center rounded-full px-2.5 text-xs font-semibold uppercase tracking-wide",
        REC_TONE[rec],
      )}
    >
      {REC_LABEL[rec]}
    </span>
  );
}

export function PipelineBadge({ status }: { status: PipelineStatus }) {
  return (
    <span
      className={cn(
        "inline-flex min-h-7 items-center rounded-full px-2.5 text-xs font-semibold uppercase tracking-wide",
        PIPE_TONE[status],
      )}
    >
      {PIPELINE_LABEL[status]}
    </span>
  );
}

export function ScoreBar({ value }: { value: number }) {
  const pct = Math.max(0, Math.min(100, (Number(value) / 10) * 100));
  return (
    <div className="h-1.5 overflow-hidden rounded-full bg-elevated">
      <div className="h-full rounded-full bg-chili" style={{ width: `${pct}%` }} />
    </div>
  );
}

export function ScorecardView({
  record,
  manager = false,
}: {
  record: InterviewRecord;
  manager?: boolean;
}) {
  const role = getRole(record.roleSlug);
  const card = record.scorecard;
  const name = `${record.candidate.firstName} ${record.candidate.lastName}`.trim();
  const overall = Number(card?.overallScore ?? 0);

  if (!card) {
    return (
      <div className="rounded-xl bg-surface p-6 text-sm text-muted shadow-card">
        Scorecard is still cooking.
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="rounded-xl bg-surface p-5 shadow-card sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-chili">
              {role.title} · {record.demo ? "Demo candidate" : "Live interview"}
            </p>
            <h1 className="mt-1 font-display text-4xl font-bold uppercase">{name}</h1>
            <p className="mt-1 text-sm text-muted">
              {formatDuration(record.durationSec ?? 0)} ·{" "}
              {record.completedAt ? relativeTime(record.completedAt) : "just now"}
            </p>
          </div>
          <div className="text-right">
            <p className="font-display text-5xl font-bold tabular-nums text-fg">
              {overall.toFixed(1)}
            </p>
            <p className="text-xs uppercase tracking-wider text-subtle">out of 10</p>
            <div className="mt-2 flex flex-col items-end gap-1.5">
              {manager && <RecBadge rec={card.recommendation} />}
              <PipelineBadge status={record.pipelineStatus ?? "reviewing"} />
            </div>
          </div>
        </div>
        <p className="mt-4 text-sm leading-relaxed text-muted">
          {manager
            ? card.summary
            : "Cam captured this conversation for the GM. Create an account so you can see next steps as they happen."}
        </p>
      </div>

      <div className="rounded-xl bg-surface p-5 shadow-card sm:p-6">
        <h2 className="font-display text-2xl font-bold uppercase">Scorecard</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {SCORE_KEYS.map(({ key, label }) => (
            <div key={key}>
              <div className="mb-1.5 flex justify-between text-sm">
                <span className="text-muted">{label}</span>
                <span className="tabular-nums text-fg">{card.scores[key]}</span>
              </div>
              <ScoreBar value={card.scores[key]} />
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Note title="Strengths" items={card.strengths} />
        <Note title={manager ? "Coach" : "Bring to the floor"} items={card.developmentAreas} />
      </div>

      <div className="rounded-xl bg-surface p-5 shadow-card sm:p-6">
        <h2 className="font-display text-2xl font-bold uppercase">Floor notes</h2>
        {manager && (
          <p className="mt-2 text-sm leading-relaxed text-muted">{card.scenarioNotes}</p>
        )}
        {record.floorAnswers.length > 0 && (
          <ul className="mt-4 space-y-2 text-sm">
            {record.floorAnswers.map((a) => (
              <li key={a.id} className="flex gap-2">
                <span className={a.correct ? "text-pepper" : "text-chili"}>●</span>
                <span className="text-muted">
                  <span className="text-fg">{a.prompt}.</span> {a.choice}
                </span>
              </li>
            ))}
          </ul>
        )}
        {manager && (
          <p className="mt-4 rounded-md bg-elevated px-3.5 py-3 text-sm text-fg">
            Next: {card.nextStep}
          </p>
        )}
      </div>

      {manager && record.transcript.length > 0 && (
        <div className="rounded-xl bg-surface p-5 shadow-card sm:p-6">
          <h2 className="font-display text-2xl font-bold uppercase">Transcript</h2>
          <div className="mt-4 max-h-[50vh] space-y-3 overflow-y-auto text-sm">
            {record.transcript.map((l) => (
              <p key={l.id}>
                <span className="font-semibold text-chili">
                  {l.role === "user" ? record.candidate.firstName : "Cam"}
                </span>
                <span className="text-muted"> — {l.text}</span>
              </p>
            ))}
          </div>
        </div>
      )}

      {!manager && (
        <p className="text-center text-sm text-subtle">
          The GM has your overview and scorecard.{" "}
          <Link to="/" className="text-chili">
            Back to careers
          </Link>
        </p>
      )}
    </div>
  );
}

function Note({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-xl bg-surface p-5 shadow-card sm:p-6">
      <h2 className="font-display text-2xl font-bold uppercase">{title}</h2>
      {items.length === 0 ? (
        <p className="mt-2 text-sm text-subtle">None noted.</p>
      ) : (
        <ul className="mt-3 space-y-2 text-sm text-muted">
          {items.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
