import { useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent, type ReactNode } from "react";
import { getRole } from "@/lib/roles";
import { useHiringStore } from "@/lib/store";
import type { Candidate, RoleSlug } from "@/lib/types";
import { cn, formatPhone, uid } from "@/lib/utils";
import { Button } from "./ui/button";

const AVAIL = ["Lunch", "Nights", "Weekends", "Mornings"] as const;
const YEARS = ["First job", "Under 1 year", "1–2 years", "3–5 years", "5+ years"];

export function ApplyForm({ roleSlug }: { roleSlug: RoleSlug }) {
  const role = getRole(roleSlug);
  const navigate = useNavigate();
  const upsert = useHiringStore((s) => s.upsert);
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    yearsExperience: "1–2 years",
    availability: ["Nights", "Weekends"] as string[],
    nightsWeekends: true,
    consent: true,
  });
  const [error, setError] = useState<string | null>(null);

  function toggleAvail(item: string) {
    setForm((f) => ({
      ...f,
      availability: f.availability.includes(item)
        ? f.availability.filter((x) => x !== item)
        : [...f.availability, item],
    }));
  }

  function fillDemo() {
    setForm({
      firstName: "Alex",
      lastName: "Rivera",
      email: "alex.rivera@email.com",
      phone: "(864) 555-0100",
      yearsExperience: "3–5 years",
      availability: ["Nights", "Weekends", "Lunch"],
      nightsWeekends: true,
      consent: true,
    });
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    if (!form.firstName.trim() || !form.lastName.trim()) {
      setError("We need a first and last name.");
      return;
    }
    if (!form.email.trim()) {
      setError("Email is required so the GM can follow up.");
      return;
    }
    if (!form.consent) {
      setError("Consent is required to run the AI interview.");
      return;
    }
    const candidate: Candidate = {
      ...form,
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
    };
    const id = uid("int");
    upsert({
      id,
      roleSlug: role.slug,
      status: "applied",
      pipelineStatus: "reviewing",
      candidate,
      createdAt: new Date().toISOString(),
      transcript: [],
      floorAnswers: [],
    });
    try {
      sessionStorage.setItem("chilis-last-interview", id);
    } catch {
      /* ignore */
    }
    void navigate({ to: "/interview/$id", params: { id } });
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <div className="rounded-xl bg-surface p-5 shadow-card sm:p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-chili">
          {role.station}
        </p>
        <h1 className="mt-1 font-display text-4xl font-bold uppercase text-fg sm:text-5xl">
          {role.title}
        </h1>
        <p className="mt-3 max-w-lg text-sm leading-relaxed text-muted">{role.blurb}</p>
        <p className="mt-2 text-xs text-subtle">
          {role.pay} · {role.hours}
        </p>
      </div>

      <div className="rounded-xl bg-surface p-5 shadow-card sm:p-6">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-display text-2xl font-bold uppercase">About you</h2>
          <button
            type="button"
            onClick={fillDemo}
            className="text-xs font-semibold uppercase tracking-wider text-chili"
          >
            Fill demo
          </button>
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field label="First name">
            <input
              required
              autoComplete="given-name"
              value={form.firstName}
              onChange={(e) => setForm({ ...form, firstName: e.target.value })}
              className={fieldClass}
            />
          </Field>
          <Field label="Last name">
            <input
              required
              autoComplete="family-name"
              value={form.lastName}
              onChange={(e) => setForm({ ...form, lastName: e.target.value })}
              className={fieldClass}
            />
          </Field>
          <Field label="Email">
            <input
              required
              type="email"
              autoComplete="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className={fieldClass}
            />
          </Field>
          <Field label="Phone">
            <input
              type="tel"
              autoComplete="tel"
              value={form.phone}
              onChange={(e) =>
                setForm({ ...form, phone: formatPhone(e.target.value) })
              }
              className={fieldClass}
            />
          </Field>
        </div>

        <Field label="Restaurant experience" className="mt-4">
          <select
            value={form.yearsExperience}
            onChange={(e) => setForm({ ...form, yearsExperience: e.target.value })}
            className={fieldClass}
          >
            {YEARS.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </Field>

        <p className="mt-5 text-sm font-medium text-fg">When can you work?</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {AVAIL.map((item) => {
            const on = form.availability.includes(item);
            return (
              <button
                key={item}
                type="button"
                onClick={() => toggleAvail(item)}
                className={cn(
                  "min-h-11 rounded-full px-4 text-sm font-medium",
                  on
                    ? "bg-chili text-cream"
                    : "bg-elevated text-muted shadow-[0_0_0_1px_var(--color-border)]",
                )}
              >
                {item}
              </button>
            );
          })}
        </div>

        <label className="mt-5 flex items-start gap-3 text-sm text-muted">
          <input
            type="checkbox"
            checked={form.nightsWeekends}
            onChange={(e) => setForm({ ...form, nightsWeekends: e.target.checked })}
            className="mt-1 size-4 accent-chili"
          />
          I can work nights, weekends, and holidays.
        </label>
        <label className="mt-3 flex items-start gap-3 text-sm text-muted">
          <input
            type="checkbox"
            checked={form.consent}
            onChange={(e) => setForm({ ...form, consent: e.target.checked })}
            className="mt-1 size-4 accent-chili"
          />
          I consent to an AI interview with Cam (GM). After scoring, the GM receives your overview.
        </label>
      </div>

      {error && (
        <p className="rounded-lg bg-chili-wash px-4 py-3 text-sm text-chili">{error}</p>
      )}

      <Button type="submit" size="lg" className="w-full">
        Continue to interview
      </Button>
    </form>
  );
}

function Field({
  label,
  children,
  className,
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={cn("block", className)}>
      <span className="text-sm font-medium text-muted">{label}</span>
      <div className="mt-1.5">{children}</div>
    </label>
  );
}

const fieldClass =
  "w-full min-h-11 rounded-md bg-elevated px-3.5 text-base text-fg shadow-[0_0_0_1px_var(--color-border)] outline-none placeholder:text-subtle focus:shadow-[0_0_0_1px_var(--color-chili)]";
