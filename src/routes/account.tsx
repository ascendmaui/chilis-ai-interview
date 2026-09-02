import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PipelineBadge } from "@/components/scorecard-view";
import { SiteFooter, SiteHeader } from "@/components/shell";
import { Button } from "@/components/ui/button";
import { openApplicantPortal } from "@/lib/hiring";
import { useHydratedStore } from "@/lib/hydrate";
import { getRole } from "@/lib/roles";
import { useGuardedSession } from "@/lib/session-guard";
import { toApplicationPayload, useHiringStore } from "@/lib/store";
import type { InterviewRecord } from "@/lib/types";
import { PIPELINE_APPLICANT_COPY } from "@/lib/types";
import { relativeTime } from "@/lib/utils";

export const Route = createFileRoute("/account")({
  component: AccountPage,
});

function AccountPage() {
  const { user, isPending } = useGuardedSession();
  const ready = useHydratedStore();
  const interviews = useHiringStore((s) => s.interviews);
  const mergeRemote = useHiringStore((s) => s.mergeRemote);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user || !ready) return;
    let lastId: string | null = null;
    try {
      lastId = sessionStorage.getItem("chilis-last-interview");
    } catch {
      lastId = null;
    }
    const local = useHiringStore.getState().interviews;
    const mine = local.filter((i) => {
      if (i.demo) return false;
      const email = user.primaryEmail?.toLowerCase();
      const matchEmail = email && i.candidate.email.toLowerCase() === email;
      const matchLast = lastId && i.id === lastId;
      return Boolean(matchEmail || matchLast || i.applicantUserId === user.id);
    });
    const work = openApplicantPortal({
      data: {
        displayName: user.displayName,
        email: user.primaryEmail,
        payloads: mine.filter((i) => i.status === "completed").map(toApplicationPayload),
      },
    });
    const timeout = new Promise<never>((_, reject) => {
      window.setTimeout(() => reject(new Error("Could not reach the hiring board")), 12000);
    });
    void Promise.race([work, timeout])
      .then((res) => {
        if (res.ok) mergeRemote(res.interviews);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Could not load applications");
      })
      .finally(() => setLoading(false));
  }, [user, ready, mergeRemote]);

  if (isPending || !ready) {
    return <div className="grid min-h-dvh place-items-center text-muted">Loading account…</div>;
  }
  if (!user) {
    return <Navigate to="/login" search={{ redirect: "/account", intent: "apply" }} />;
  }

  const mine = interviews.filter((i) => {
    if (i.demo) return false;
    const email = user.primaryEmail?.toLowerCase();
    const matchEmail = email && i.candidate.email.toLowerCase() === email;
    return Boolean(matchEmail || i.applicantUserId === user.id);
  });

  return (
    <div className="min-h-dvh">
      <SiteHeader />
      <main className="mx-auto max-w-2xl px-4 py-8">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-chili">
          Applicant dashboard
        </p>
        <h1 className="mt-1 font-display text-5xl font-bold uppercase">Your applications</h1>
        <p className="mt-2 text-sm text-muted">
          Updates from the GM land here — reviewing, floor invite, or next steps.
        </p>

        {error && <p className="mt-4 text-sm text-chili">{error}</p>}

        <div className="mt-6 space-y-3">
          {loading && mine.length === 0 && (
            <p className="rounded-xl bg-surface p-5 text-sm text-muted shadow-card">
              Loading your interviews…
            </p>
          )}
          {!loading && mine.length === 0 && (
            <div className="rounded-xl bg-surface p-6 shadow-card">
              <h2 className="font-display text-2xl font-bold uppercase">No applications yet</h2>
              <p className="mt-2 text-sm text-muted">
                Interview with Cam first. We'll keep scorecards and GM notes on this page.
              </p>
              <Button asChild className="mt-4">
                <Link to="/">Browse open seats</Link>
              </Button>
            </div>
          )}
          {mine.map((rec) => (
            <ApplicationCard key={rec.id} record={rec} />
          ))}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}

function ApplicationCard({ record }: { record: InterviewRecord }) {
  const role = getRole(record.roleSlug);
  const status = record.pipelineStatus ?? "reviewing";
  return (
    <article className="rounded-xl bg-surface p-5 shadow-card">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-chili">
            {role.title}
          </p>
          <h2 className="mt-1 font-display text-2xl font-bold uppercase">
            {record.candidate.firstName} {record.candidate.lastName}
          </h2>
          <p className="mt-1 text-xs text-subtle">
            {record.completedAt ? relativeTime(record.completedAt) : "In progress"}
          </p>
        </div>
        <PipelineBadge status={status} />
      </div>
      <p className="mt-3 text-sm leading-relaxed text-muted">
        {record.status === "completed"
          ? PIPELINE_APPLICANT_COPY[status]
          : "Finish your interview with Cam to send this to the GM."}
      </p>
      {record.status === "completed" ? (
        <Button asChild variant="secondary" size="sm" className="mt-4">
          <Link to="/done/$id" params={{ id: record.id }}>
            View results
          </Link>
        </Button>
      ) : (
        <Button asChild size="sm" className="mt-4">
          <Link to="/interview/$id" params={{ id: record.id }}>
            Continue interview
          </Link>
        </Button>
      )}
    </article>
  );
}
