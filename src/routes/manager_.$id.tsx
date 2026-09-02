import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { useState } from "react";
import { ApplicantOverview } from "@/components/applicant-overview";
import { ScorecardView } from "@/components/scorecard-view";
import { SiteFooter, SiteHeader } from "@/components/shell";
import { Button } from "@/components/ui/button";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { setPipelineStatus as savePipelineStatus } from "@/lib/hiring";
import { useHydratedStore } from "@/lib/hydrate";
import { useGuardedSession } from "@/lib/session-guard";
import { useHiringStore } from "@/lib/store";
import type { PipelineStatus } from "@/lib/types";

export const Route = createFileRoute("/manager_/$id")({
  component: ManagerDetailPage,
});

function ManagerDetailPage() {
  const { id } = Route.useParams();
  const ready = useHydratedStore();
  const { user, isPending } = useGuardedSession();
  const record = useHiringStore((s) => s.interviews.find((i) => i.id === id));
  const setLocal = useHiringStore((s) => s.setPipelineStatus);
  const [busy, setBusy] = useState(false);

  async function onStatus(status: PipelineStatus) {
    if (!record) return;
    setBusy(true);
    setLocal(record.id, status);
    try {
      await savePipelineStatus({ data: { id: record.id, pipelineStatus: status } });
    } catch {
      /* local board still updates */
    } finally {
      setBusy(false);
    }
  }

  if (isPending) {
    return <div className="grid min-h-dvh place-items-center text-muted">Loading…</div>;
  }
  if (!user) {
    return <Navigate to="/login" search={{ redirect: "/manager", intent: "hire" }} />;
  }

  return (
    <div className="min-h-dvh">
      <SiteHeader manager />
      <main className="mx-auto max-w-2xl px-4 py-8">
        <Button asChild variant="ghost" size="sm" className="mb-4 -ml-2">
          <Link to="/manager">
            <ArrowLeft className="size-4" />
            Board
          </Link>
        </Button>
        {!ready && <p className="text-muted">Loading…</p>}
        {ready && !record && <p className="text-muted">Candidate not found.</p>}
        {record && (
          <div className="space-y-5">
            <ApplicantOverview record={record} onStatus={onStatus} busy={busy} />
            <ScorecardView record={record} manager />
          </div>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
