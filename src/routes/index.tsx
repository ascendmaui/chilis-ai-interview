import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Clock, Mic, LayoutDashboard } from "lucide-react";
import { RoleCard } from "@/components/role-card";
import { SiteFooter, SiteHeader } from "@/components/shell";
import { Button } from "@/components/ui/button";
import { ROLES, STORE } from "@/lib/roles";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  return (
    <div className="min-h-dvh">
      <SiteHeader />
      <main>
        <section className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-12 sm:px-6 lg:grid-cols-2 lg:py-16">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full bg-surface px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-chili shadow-card">
              <span className="size-1.5 rounded-full bg-chili" />
              Now hiring · {STORE.location}
            </p>
            <h1 className="mt-5 max-w-xl font-display text-6xl font-extrabold uppercase leading-[0.9] text-fg sm:text-8xl">
              Hire the floor
              <span className="block text-chili">in 12 minutes.</span>
            </h1>
            <p className="mt-5 max-w-lg text-pretty text-base leading-relaxed text-muted sm:text-lg">
              Chili's AI Interview screens servers, hosts, cooks, and bartenders with Cam, your GM. Real floor situations. A scorecard the hiring manager can actually use.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg">
                <a href="#roles">
                  Apply now
                  <ArrowRight className="size-4" />
                </a>
              </Button>
              <Button asChild variant="cream" size="lg">
                <Link to="/manager">I'm the GM</Link>
              </Button>
            </div>
          </div>
          <div className="relative">
            <img
              src="/images/hero.jpg"
              alt="Sizzling fajitas in a warm grill-and-bar dining room"
              className="h-64 w-full rounded-xl object-cover shadow-card sm:h-80 lg:h-[28rem]"
            />
            <div className="absolute bottom-4 left-4 rounded-full bg-surface/95 px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-fg shadow-card">
              Cam is live
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
          <div className="grid gap-4 sm:grid-cols-3">
            <Step
              icon={Clock}
              title="10 minutes"
              body="Applicants interview on their phone. No scheduling. No no-shows for a first screen."
            />
            <Step
              icon={Mic}
              title="Voice + floor calls"
              body="Cam talks like a GM. Rush pop-ups test whether they can think while the board is on fire."
            />
            <Step
              icon={LayoutDashboard}
              title="GM scorecard"
              body="Hospitality, reliability, guest recovery, hire / hold / pass. Transcript included."
            />
          </div>
        </section>

        <section id="roles" className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-chili">Open seats</p>
          <h2 className="mt-2 font-display text-5xl font-bold uppercase">Pick a station</h2>
          <p className="mt-2 max-w-xl text-sm text-muted">
            Same Chili's energy. Different questions for the door, the well, the line, and the floor lead.
          </p>
          <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {ROLES.map((role, i) => (
              <div key={role.slug} className="animate-rise">
                <RoleCard role={role} index={i} />
              </div>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 pb-8 sm:px-6">
          <div className="grid overflow-hidden rounded-xl bg-surface shadow-card lg:grid-cols-2">
            <img
              src="/images/gm.jpg"
              alt="Cam, the AI general manager interviewer"
              className="h-64 w-full object-cover object-[50%_18%] lg:h-full"
            />
            <div className="p-6 sm:p-8">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-chili">Meet Cam</p>
              <h2 className="mt-2 font-display text-4xl font-bold uppercase">
                Your GM. On every application.
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-muted">
                Cam runs the first screen so you don't spend Friday afternoon on people who can't work weekends or freeze when a steak comes back. You still hire. Cam just clears the floor.
              </p>
              <Button asChild className="mt-6">
                <Link to="/manager">
                  Open the hiring board
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}

function Step({
  icon: Icon,
  title,
  body,
}: {
  icon: typeof Clock;
  title: string;
  body: string;
}) {
  return (
    <div className="rounded-xl bg-surface p-5 shadow-card">
      <span className="grid size-10 place-items-center rounded-md bg-elevated text-chili">
        <Icon className="size-5" strokeWidth={1.75} />
      </span>
      <h3 className="mt-4 font-display text-2xl font-bold uppercase">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-muted">{body}</p>
    </div>
  );
}
