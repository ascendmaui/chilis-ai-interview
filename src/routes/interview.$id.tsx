import { createFileRoute, Link } from "@tanstack/react-router";
import { InterviewRoom } from "@/components/interview-room";
import { BrandLockup } from "@/components/pepper";
import { useHydratedStore } from "@/lib/hydrate";
import { useHiringStore } from "@/lib/store";

export const Route = createFileRoute("/interview/$id")({
  component: InterviewPage,
});

function InterviewPage() {
  const { id } = Route.useParams();
  const ready = useHydratedStore();
  const record = useHiringStore((s) => s.interviews.find((i) => i.id === id));

  if (!ready) {
    return (
      <div className="grid min-h-dvh place-items-center text-muted">Loading interview…</div>
    );
  }

  if (!record) {
    return (
      <div className="grid min-h-dvh place-items-center px-6 text-center">
        <div>
          <BrandLockup />
          <h1 className="mt-6 font-display text-4xl font-bold uppercase">Interview not found</h1>
          <p className="mt-2 text-sm text-muted">Start from careers to open a new seat.</p>
          <Link to="/" className="mt-4 inline-block text-chili">
            Back to careers
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh">
      <div className="flex items-center justify-between px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <Link to="/">
          <BrandLockup compact />
        </Link>
      </div>
      <InterviewRoom record={record} />
    </div>
  );
}
