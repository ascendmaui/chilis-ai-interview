import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { BrandLockup } from "@/components/pepper";
import { Button } from "@/components/ui/button";
import {
  GROK_PROVIDERS,
  authClient,
  authEnabled,
  signIn,
} from "@/lib/auth/client";
import { useGuardedSession } from "@/lib/session-guard";
import { cn } from "@/lib/utils";

type Intent = "apply" | "hire";

export const Route = createFileRoute("/login")({
  validateSearch: (search: Record<string, unknown>) => ({
    redirect: typeof search.redirect === "string" && search.redirect.startsWith("/")
      ? search.redirect
      : "/",
    intent: search.intent === "hire" ? ("hire" as Intent) : ("apply" as Intent),
  }),
  component: LoginPage,
});

function LoginPage() {
  const { redirect, intent } = Route.useSearch();
  const navigate = useNavigate();
  const { user, isPending } = useGuardedSession();
  const [mode, setMode] = useState<"signin" | "signup">("signup");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  const dest = redirect || (intent === "hire" ? "/manager" : "/account");

  function goDest() {
    if (dest.startsWith("/manager")) {
      void navigate({ to: "/manager" });
      return;
    }
    if (dest.startsWith("/account")) {
      void navigate({ to: "/account" });
      return;
    }
    if (dest.startsWith("/interview/")) {
      const id = dest.replace("/interview/", "").split(/[/?#]/)[0];
      if (id) {
        void navigate({ to: "/interview/$id", params: { id } });
        return;
      }
    }
    void navigate({ to: "/" });
  }

  useEffect(() => {
    if (!isPending && user) goDest();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- dest is derived from search
  }, [isPending, user]);

  async function onSocial(providerId: string) {
    setError(null);
    setBusy(true);
    setStatus(`Opening ${providerId === "grok-google" ? "Google" : "X"}…`);
    const stayHere =
      typeof window !== "undefined"
        ? `${window.location.pathname}${window.location.search}`
        : "/login";
    try {
      await Promise.race([
        signIn(providerId, { callbackURL: stayHere, errorCallbackURL: stayHere }),
        new Promise<never>((_, reject) => {
          window.setTimeout(() => {
            reject(
              new Error(
                "Sign-in took too long. Close the extra window and try again, or use email.",
              ),
            );
          }, 45000);
        }),
      ]);
      setStatus("Signed in — heading over…");
      await authClient.getSession().catch(() => undefined);
      goDest();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign-in failed");
      setBusy(false);
      setStatus(null);
    }
  }

  async function onEmail(e: FormEvent) {
    e.preventDefault();
    if (!authEnabled) return;
    setBusy(true);
    setError(null);
    setStatus(mode === "signup" ? "Creating your account…" : "Signing you in…");
    try {
      if (mode === "signup") {
        const { error: signUpError } = await authClient.signUp.email({
          email: email.trim(),
          password,
          name: name.trim() || email.split("@")[0],
          callbackURL: dest,
        });
        if (signUpError) throw new Error(signUpError.message ?? "Could not create account");
      } else {
        const { error: signInError } = await authClient.signIn.email({
          email: email.trim(),
          password,
          callbackURL: dest,
        });
        if (signInError) throw new Error(signInError.message ?? "Could not sign in");
      }
      await authClient.getSession();
      goDest();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setBusy(false);
      setStatus(null);
    }
  }

  const overlay = busy || Boolean(user);

  return (
    <div className="grid min-h-dvh place-items-center px-4 py-10 pb-[max(2.5rem,env(safe-area-inset-bottom))]">
      <div className="w-full max-w-md">
        <Link to="/" className="mb-6 flex justify-center">
          <BrandLockup />
        </Link>
        <div className="relative overflow-hidden rounded-xl bg-surface p-6 shadow-card sm:p-8">
          {overlay && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-surface/92 px-6 text-center">
              <div className="size-10 animate-spin rounded-full border-2 border-border border-t-chili" />
              <p className="mt-4 font-display text-2xl font-bold uppercase">
                {user ? "You're in" : "Signing you in"}
              </p>
              <p className="mt-2 text-sm text-muted">
                {status ?? "Talking to Google. Keep this window open."}
              </p>
            </div>
          )}
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-chili">
            {intent === "hire" ? "GM sign-in" : "Applicant account"}
          </p>
          <h1 className="mt-2 font-display text-4xl font-bold uppercase">
            {mode === "signup" ? "Create an account" : "Welcome back"}
          </h1>
          <p className="mt-2 text-sm text-muted">
            {intent === "hire"
              ? "Sign in to open the hiring board, scorecards, and applicant overviews."
              : "Save your interview, get GM updates, and see next steps."}
          </p>

          {!authEnabled ? (
            <p className="mt-6 text-sm text-muted">Sign-in is disabled.</p>
          ) : (
            <>
              <div className="mt-6 grid gap-2">
                {GROK_PROVIDERS.map((p) => (
                  <Button
                    key={p.providerId}
                    type="button"
                    variant="secondary"
                    className="w-full rounded-lg"
                    disabled={busy}
                    onClick={() => void onSocial(p.providerId)}
                  >
                    {p.providerId === "grok-google" ? <GoogleMark /> : <XMark />}
                    Continue with {p.label}
                  </Button>
                ))}
              </div>

              <div className="my-5 flex items-center gap-3 text-xs uppercase tracking-wider text-subtle">
                <span className="h-px flex-1 bg-border" />
                or email
                <span className="h-px flex-1 bg-border" />
              </div>

              <div className="mb-4 grid grid-cols-2 rounded-full bg-elevated p-1 text-sm">
                <button
                  type="button"
                  className={cn(
                    "min-h-10 rounded-full font-medium",
                    mode === "signup" ? "bg-surface text-fg shadow-card" : "text-muted",
                  )}
                  onClick={() => setMode("signup")}
                >
                  Sign up
                </button>
                <button
                  type="button"
                  className={cn(
                    "min-h-10 rounded-full font-medium",
                    mode === "signin" ? "bg-surface text-fg shadow-card" : "text-muted",
                  )}
                  onClick={() => setMode("signin")}
                >
                  Log in
                </button>
              </div>

              <form onSubmit={(e) => void onEmail(e)} className="space-y-3">
                {mode === "signup" && (
                  <label className="block text-sm">
                    <span className="font-medium text-muted">Name</span>
                    <input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      autoComplete="name"
                      className={fieldClass}
                    />
                  </label>
                )}
                <label className="block text-sm">
                  <span className="font-medium text-muted">Email</span>
                  <input
                    required
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                    className={fieldClass}
                  />
                </label>
                <label className="block text-sm">
                  <span className="font-medium text-muted">Password</span>
                  <input
                    required
                    type="password"
                    minLength={8}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete={mode === "signup" ? "new-password" : "current-password"}
                    className={fieldClass}
                  />
                </label>
                {error && (
                  <p className="rounded-lg bg-chili-wash px-3 py-2 text-sm text-chili">{error}</p>
                )}
                <Button type="submit" className="w-full" disabled={busy}>
                  {busy
                    ? "Working…"
                    : mode === "signup"
                      ? "Create account"
                      : "Log in"}
                </Button>
              </form>
            </>
          )}
        </div>
        <p className="mt-4 text-center text-sm text-subtle">
          {intent === "hire" ? (
            <Link to="/" className="text-chili">
              Back to careers
            </Link>
          ) : (
            <Link to="/manager" className="text-chili">
              I'm the GM
            </Link>
          )}
        </p>
      </div>
    </div>
  );
}

const fieldClass =
  "mt-1.5 w-full min-h-11 rounded-md bg-elevated px-3.5 text-base text-fg shadow-[0_0_0_1px_var(--color-border)] outline-none focus:shadow-[0_0_0_1px_var(--color-chili)]";

function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" aria-hidden="true">
      <path
        fill="#EA4335"
        d="M12 10.2v3.6h5.1c-.2 1.2-.9 2.3-1.9 3l3.1 2.4c1.8-1.7 2.9-4.2 2.9-7.2 0-.7-.1-1.3-.2-1.8z"
      />
      <path
        fill="#34A853"
        d="M6.6 14.4 5.5 15.2l-3.8 3C4 21.1 7.7 23 12 23c3 0 5.6-1 7.4-2.8l-3.1-2.4c-.9.6-2 1-3.3 1-2.5 0-4.7-1.7-5.4-4z"
      />
      <path
        fill="#FBBC05"
        d="M2.6 6.8C1.6 8.8 1 11 1 13.4c0 2.3.6 4.5 1.6 6.4l4.9-3.8c-.3-.8-.5-1.7-.5-2.6s.2-1.8.5-2.6z"
      />
      <path
        fill="#4285F4"
        d="M12 5.1c1.6 0 3.1.6 4.2 1.6l3.1-3.1C17.6 1.8 15 1 12 1 7.7 1 4 2.9 2.6 6.8l4.9 3.8C8.3 6.8 10.5 5.1 12 5.1z"
      />
    </svg>
  );
}

function XMark() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" aria-hidden="true">
      <path
        fill="currentColor"
        d="M18.2 2H21l-6.6 7.5L22 22h-6.2l-4.8-6.3L5.5 22H2.7l7-8L2 2h6.3l4.4 5.8zm-1.1 18h1.7L7 3.9H5.2z"
      />
    </svg>
  );
}
