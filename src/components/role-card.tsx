import { Link } from "@tanstack/react-router";
import {
  ConciergeBell,
  Flame,
  ShoppingBag,
  UtensilsCrossed,
  Wine,
  ClipboardList,
  ArrowRight,
} from "lucide-react";
import type { Role } from "@/lib/roles";
import { cn } from "@/lib/utils";

const ICONS = {
  server: UtensilsCrossed,
  host: ConciergeBell,
  bartender: Wine,
  "line-cook": Flame,
  togo: ShoppingBag,
  "shift-manager": ClipboardList,
} as const;

export function RoleCard({ role, index }: { role: Role; index: number }) {
  const Icon = ICONS[role.slug];
  return (
    <Link
      to="/apply"
      search={{ role: role.slug }}
      className={cn(
        "group flex flex-col rounded-xl bg-surface p-5 shadow-card transition-transform duration-200",
        "hover:-translate-y-0.5",
      )}
      style={{ animationDelay: `${index * 40}ms` }}
    >
      <span className="flex size-11 items-center justify-center rounded-md bg-elevated text-chili">
        <Icon className="size-5" strokeWidth={1.75} />
      </span>
      <span className="mt-4 font-display text-2xl font-bold uppercase text-fg">
        {role.title}
      </span>
      <span className="mt-1 text-xs font-semibold uppercase tracking-[0.14em] text-muted">
        {role.station} · {role.pay}
      </span>
      <span className="mt-3 text-sm leading-relaxed text-muted">{role.blurb}</span>
      <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-chili">
        Start interview
        <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
      </span>
    </Link>
  );
}
