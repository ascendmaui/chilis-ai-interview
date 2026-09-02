import { Link } from "@tanstack/react-router";
import { getRole, STORE } from "@/lib/roles";
import { useHiringStore } from "@/lib/store";
import type { InterviewRecord, Recommendation } from "@/lib/types";
import { relativeTime } from "@/lib/utils";
import { PipelineBadge, RecBadge } from "./scorecard-view";
import { Button } from "./ui/button";

const COLS: { key: Recommendation | "open"; label: string }[] = [
  { key: "open", label: "In interview" },
  { key: "strong_yes", label: "Strong hire" },
  { key: "yes", label: "Hire" },
  { key: "maybe", label: "Hold" },
  { key: "no", label: "Pass" },
];

function bucket(rec: InterviewRecord): Recommendation | "open" {
  if (!rec.scorecard) return "open";
  return rec.scorecard.recommendation;
}

export function ManagerBoard() {
  const interviews = useHiringStore((s) => s.interviews);
  const resetDemo = useHiringStore((s) => s.resetDemo);

  const stats = {
    total: interviews.length,
    hire: interviews.filter(
      (i) =>
        i.scorecard?.recommendation === "yes" ||
        i.scorecard?.recommendation === "strong_yes",
    ).length,
    hold: interviews.filter((i) => i.scorecard?.recommendation === "maybe").length,
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-chili">
            {STORE.brand} · {STORE.location}
          </p>
          <h1 className="mt-1 font-display text-5xl font-bold uppercase text-fg">
            Hiring board
          </h1>
          <p className="mt-2 max-w-xl text-sm text-muted">
            Cam screens every applicant in about 10 minutes. You see the overview, scorecard, floor judgment, and transcript — then decide who gets a trail shift.
          </p>
        </div>
        <Button variant="secondary" size="sm" onClick={resetDemo}>
          Reset demo data
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Stat n={stats.total} label="In pipeline" />
        <Stat n={stats.hire} label="Hire-ready" />
        <Stat n={stats.hold} label="Need a listen" />
      </div>

      <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-2 lg:mx-0 lg:grid lg:grid-cols-5 lg:overflow-visible lg:px-0">
        {COLS.map((col) => {
          const items = interviews.filter((i) => bucket(i) === col.key);
          return (
            <section key={col.key} className="w-64 shrink-0 lg:w-auto">
              <h2 className="mb-3 flex items-center justify-between text-xs font-semibold uppercase tracking-[0.14em] text-muted">
                {col.label}
                <span className="tabular-nums text-subtle">{items.length}</span>
              </h2>
              <div className="space-y-2">
                {items.length === 0 && (
                  <p className="rounded-lg bg-surface px-3 py-4 text-xs text-subtle shadow-card">
                    Empty
                  </p>
                )}
                {items.map((i) => (
                  <CandidateCard key={i.id} record={i} />
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}

function Stat({ n, label }: { n: number; label: string }) {
  return (
    <div className="rounded-xl bg-surface px-4 py-4 shadow-card">
      <p className="font-display text-4xl font-bold tabular-nums">{n}</p>
      <p className="mt-1 text-xs uppercase tracking-wider text-muted">{label}</p>
    </div>
  );
}

function CandidateCard({ record }: { record: InterviewRecord }) {
  const role = getRole(record.roleSlug);
  const name = `${record.candidate.firstName} ${record.candidate.lastName}`;
  return (
    <Link
      to="/manager/$id"
      params={{ id: record.id }}
      className="block rounded-lg bg-surface p-3.5 shadow-card transition-transform hover:-translate-y-0.5"
    >
      <div className="flex items-start justify-between gap-2">
        <p className="font-medium text-fg">{name}</p>
        {record.scorecard && (
          <span className="font-display text-xl font-bold tabular-nums">
            {Number(record.scorecard.overallScore).toFixed(1)}
          </span>
        )}
      </div>
      <p className="mt-1 text-xs text-muted">
        {role.title}
        {record.completedAt ? ` · ${relativeTime(record.completedAt)}` : " · live"}
      </p>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {record.scorecard && <RecBadge rec={record.scorecard.recommendation} />}
        {record.status === "completed" && (
          <PipelineBadge status={record.pipelineStatus ?? "reviewing"} />
        )}
      </div>
      {!record.scorecard && (
        <p className="mt-2 text-xs text-chili">
          {record.status === "in_progress" ? "Interview running" : "Waiting"}
        </p>
      )}
    </Link>
  );
}
