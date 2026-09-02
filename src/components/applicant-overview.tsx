import { Mail, Phone, Clock, CalendarDays } from "lucide-react";
import { getRole } from "@/lib/roles";
import type { InterviewRecord, PipelineStatus } from "@/lib/types";
import { PIPELINE_LABEL } from "@/lib/types";
import { cn, formatDuration } from "@/lib/utils";
import { Button } from "./ui/button";

const ACTIONS: { status: PipelineStatus; label: string }[] = [
  { status: "reviewing", label: "Keep reviewing" },
  { status: "floor_invite", label: "Invite to floor" },
  { status: "offer", label: "Next steps" },
  { status: "passed", label: "Pass" },
];

export function ApplicantOverview({
  record,
  onStatus,
  busy = false,
}: {
  record: InterviewRecord;
  onStatus?: (status: PipelineStatus) => void;
  busy?: boolean;
}) {
  const role = getRole(record.roleSlug);
  const c = record.candidate;
  const current = record.pipelineStatus ?? "reviewing";
  const correct = record.floorAnswers.filter((a) => a.correct).length;

  return (
    <div className="rounded-xl bg-surface p-5 shadow-card sm:p-6">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-chili">
        Applicant overview
      </p>
      <h2 className="mt-1 font-display text-3xl font-bold uppercase">
        {c.firstName} {c.lastName}
      </h2>
      <p className="mt-1 text-sm text-muted">
        {role.title} · {role.station}
      </p>

      <dl className="mt-5 grid gap-3 sm:grid-cols-2">
        <Row icon={Mail} label="Email" value={c.email || "Not given"} />
        <Row icon={Phone} label="Phone" value={c.phone || "Not given"} />
        <Row icon={Clock} label="Experience" value={c.yearsExperience || "Not given"} />
        <Row
          icon={CalendarDays}
          label="Shift length"
          value={formatDuration(record.durationSec ?? 0)}
        />
      </dl>

      <p className="mt-5 text-sm font-medium text-fg">Availability</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {(c.availability.length ? c.availability : ["Not listed"]).map((item) => (
          <span
            key={item}
            className="rounded-full bg-elevated px-3 py-1.5 text-xs font-medium text-fg"
          >
            {item}
          </span>
        ))}
        <span
          className={cn(
            "rounded-full px-3 py-1.5 text-xs font-medium",
            c.nightsWeekends ? "bg-pepper/15 text-pepper-hot" : "bg-chili-wash text-chili",
          )}
        >
          {c.nightsWeekends ? "Nights & weekends yes" : "Nights & weekends no"}
        </span>
      </div>

      <p className="mt-5 text-sm text-muted">
        Floor calls:{" "}
        <span className="font-medium text-fg">
          {correct}/{record.floorAnswers.length || 0} sound
        </span>
        {record.sentToManager ? " · Sent to GM board" : ""}
      </p>

      {onStatus && (
        <div className="mt-5">
          <p className="text-sm font-medium text-fg">
            Pipeline · {PIPELINE_LABEL[current]}
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {ACTIONS.map((a) => (
              <Button
                key={a.status}
                type="button"
                size="sm"
                variant={a.status === current ? "primary" : "secondary"}
                disabled={busy}
                onClick={() => onStatus(a.status)}
              >
                {a.label}
              </Button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Row({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Mail;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-2.5">
      <span className="mt-0.5 grid size-8 place-items-center rounded-md bg-elevated text-chili">
        <Icon className="size-4" strokeWidth={1.75} />
      </span>
      <div>
        <dt className="text-xs uppercase tracking-wider text-subtle">{label}</dt>
        <dd className="text-sm text-fg">{value}</dd>
      </div>
    </div>
  );
}
