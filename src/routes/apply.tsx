import { createFileRoute, Link } from "@tanstack/react-router";
import { ApplyForm } from "@/components/apply-form";
import { SiteFooter, SiteHeader } from "@/components/shell";
import { getRole } from "@/lib/roles";
import type { RoleSlug } from "@/lib/types";
import { cn } from "@/lib/utils";

const SLUGS: RoleSlug[] = [
  "server",
  "host",
  "bartender",
  "line-cook",
  "togo",
  "shift-manager",
];

export const Route = createFileRoute("/apply")({
  validateSearch: (search: Record<string, unknown>) => {
    const role = typeof search.role === "string" ? search.role : "server";
    return { role: (SLUGS.includes(role as RoleSlug) ? role : "server") as RoleSlug };
  },
  component: ApplyPage,
});

function ApplyPage() {
  const { role } = Route.useSearch();
  const current = getRole(role);
  return (
    <div className="min-h-dvh">
      <SiteHeader />
      <main className="mx-auto max-w-lg px-4 py-8 sm:px-0">
        <div className="mb-4 flex flex-wrap gap-2">
          {SLUGS.map((slug) => {
            const r = getRole(slug);
            const on = slug === current.slug;
            return (
              <Link
                key={slug}
                to="/apply"
                search={{ role: slug }}
                className={cn(
                  "rounded-full px-3 py-1.5 text-xs font-semibold",
                  on ? "bg-chili text-cream" : "bg-surface text-muted shadow-card",
                )}
              >
                {r.title}
              </Link>
            );
          })}
        </div>
        <ApplyForm roleSlug={current.slug} />
      </main>
      <SiteFooter />
    </div>
  );
}
