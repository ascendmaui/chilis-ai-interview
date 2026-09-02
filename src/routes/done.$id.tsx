import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { useEffect } from "react";
import { ScorecardView } from "@/components/scorecard-view";
import { SiteFooter, SiteHeader } from "@/components/shell";
import { Button } from "@/components/ui/button";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { sendToManager } from "@/lib/hiring";
import { useHydratedStore } from "@/lib/hydrate";
import { useGuardedSession } from "@/lib/session-guard";
import { toApplicationPayload, useHiringStore } from "@/lib/store";

export const Route = createFileRoute("/done/$id")({
  component: DonePage,
});

function DonePage() {
  const { id } = Route.useParams();
  const ready = useHydratedStore();
  const record = useHiringStore((s) => s.interviews.find((i) => i.id === id));
  const patch = useHiringStore((s) => s.patch);
  const { user, isPending } = useGuardedSession();

  useEffect(() => {
    if (!record || record.sentToManager || !record.scorecard) return;
    void sendToManager({ data: toApplicationPayload(record) })
      .then((res) => {
        if (res.ok) patch(record.id, { sentToManager: true });
      })
      .catch(() => undefined);
  }, [patch, record]);

  if (!ready) {
    return <div className="grid min-h-dvh place-items-center text-muted">Loading…</div>;
  }

  if (!record) {
    return (
      <div className="grid min-h-dvh place-items-center">
        <Link to="/" className="text-chili">
          Interview not found
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-dvh">
      <SiteHeader />
      <main className="mx-auto max-w-2xl px-4 py-8">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-chili">
          You're done
        </p>
        <h1 className="mt-1 font-display text-5xl font-bold uppercase">Thanks for showing up.</h1>
        <p className="mt-2 mb-6 text-sm text-muted">
          Cam scored the conversation and sent your overview to the GM at this Chili's.
        </p>

        <AccountPrompt signedIn={Boolean(user)} pending={isPending} />

        <div className="mt-6">
          <ScorecardView record={record} />
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}

function AccountPrompt({ signedIn, pending }: { signedIn: boolean; pending: boolean }) {
  if (pending) {
    return <div className="h-36 animate-pulse rounded-xl bg-elevated" />;
  }

  if (signedIn) {
    return (
      <div className="rounded-xl bg-surface p-5 shadow-card sm:p-6">
        <h2 className="font-display text-2xl font-bold uppercase">You're signed in</h2>
        <p className="mt-2 text-sm text-muted">
          Track this application, GM updates, and next steps from your dashboard.
        </p>
        <Button asChild className="mt-4">
          <Link to="/account">
            Open my applications
            <ArrowRight className="size-4" />
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="rounded-xl bg-surface p-5 shadow-card sm:p-6">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-chili">
        Next step
      </p>
      <h2 className="mt-1 font-display text-3xl font-bold uppercase">Create an account</h2>
      <p className="mt-2 text-sm leading-relaxed text-muted">
        Save this interview so you can see GM updates — floor invite, next steps, or a pass — without hunting for an email.
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button asChild>
          <Link to="/login" search={{ redirect: "/account", intent: "apply" }}>
            Create account
            <ArrowRight className="size-4" />
          </Link>
        </Button>
        <Button asChild variant="secondary">
          <Link to="/login" search={{ redirect: "/account", intent: "apply" }}>
            I already have one
          </Link>
        </Button>
      </div>
    </div>
  );
}
