import { Link } from "@tanstack/react-router";
import { UserButton } from "@/lib/auth/gates";
import { useGuardedSession } from "@/lib/session-guard";
import { Button } from "./ui/button";

export function AuthSlot({ compact = false }: { compact?: boolean }) {
  const { user, isPending } = useGuardedSession();

  if (isPending) {
    return <div className="h-9 w-24 animate-pulse rounded-full bg-elevated" />;
  }

  if (!user) {
    return (
      <Button asChild variant="ghost" size="sm">
        <Link to="/login" search={{ redirect: "/", intent: "apply" }}>
          Sign in
        </Link>
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      {!compact && (
        <Button asChild variant="ghost" size="sm">
          <Link to="/account">My applications</Link>
        </Button>
      )}
      <UserButton />
    </div>
  );
}
