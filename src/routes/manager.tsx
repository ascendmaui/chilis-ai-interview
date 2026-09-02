import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ManagerBoard } from "@/components/manager-board";
import { SiteFooter, SiteHeader } from "@/components/shell";
import { openManagerBoard } from "@/lib/hiring";
import { useHydratedStore } from "@/lib/hydrate";
import { useGuardedSession } from "@/lib/session-guard";
import { useHiringStore } from "@/lib/store";

export const Route = createFileRoute("/manager")({
  component: ManagerPage,
});

function ManagerPage() {
  const ready = useHydratedStore();
  const { user, isPending } = useGuardedSession();
  const mergeRemote = useHiringStore((s) => s.mergeRemote);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    const work = openManagerBoard({
      data: { displayName: user.displayName, email: user.primaryEmail },
    });
    const timeout = new Promise<never>((_, reject) => {
      window.setTimeout(() => reject(new Error("Could not reach the hiring board")), 12000);
    });
    void Promise.race([work, timeout])
      .then((res) => {
        if (res.ok) mergeRemote(res.interviews);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Could not load the board");
      });
  }, [mergeRemote, user]);

  if (isPending) {
    return <div className="grid min-h-dvh place-items-center text-muted">Loading board…</div>;
  }
  if (!user) {
    return <Navigate to="/login" search={{ redirect: "/manager", intent: "hire" }} />;
  }

  return (
    <div className="min-h-dvh">
      <SiteHeader manager />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        {error && <p className="mb-4 text-sm text-chili">{error}</p>}
        {ready ? <ManagerBoard /> : <p className="text-muted">Loading board…</p>}
      </main>
      <SiteFooter />
    </div>
  );
}
