import { useEffect, useState } from "react";
import { authClient } from "@/lib/auth/client";
import {
  useCurrentUserState,
  type AppUser,
} from "@/lib/auth/use-current-user";

/**
 * Session hook that cannot spin forever. If Better Auth's get-session never
 * settles (common after a Google popup in the live preview iframe), we retry
 * once and then treat the visitor as signed out so the UI can recover.
 */
export function useGuardedSession(timeoutMs = 8000): {
  user: AppUser | null;
  isPending: boolean;
  stalled: boolean;
} {
  const { user, isPending } = useCurrentUserState();
  const [stalled, setStalled] = useState(false);

  useEffect(() => {
    if (!isPending) {
      setStalled(false);
      return;
    }
    const retry = window.setTimeout(() => {
      void authClient.getSession().catch(() => undefined);
    }, 2200);
    const giveUp = window.setTimeout(() => setStalled(true), timeoutMs);
    return () => {
      window.clearTimeout(retry);
      window.clearTimeout(giveUp);
    };
  }, [isPending, timeoutMs]);

  return {
    user,
    isPending: isPending && !stalled,
    stalled,
  };
}
