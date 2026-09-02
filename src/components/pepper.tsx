import { cn } from "@/lib/utils";

export function PepperMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 64 64"
      className={cn("shrink-0", className)}
      aria-hidden="true"
    >
      <path
        d="M38.2 8.4c-1.4 3.8-1.1 7.2.4 10.2 2.4-1.1 4.8-1.4 7.2-.6-2.8 3.2-6.8 4.2-11.2 2.8-1.8 4.6-1.2 9.4 1.6 14.4 2.4 4.3 2.8 8.6 1.1 12.8-1.8 4.4-5.4 7.4-10.6 8.8-5.4 1.4-10.2.4-14.2-3.2-4.2-3.8-6-9-5.4-15.4.6-6.6 3.6-13.4 8.8-20.4C21.4 11.2 27.2 7.2 33.6 6c1.2 1.1 2.8 1.8 4.6 2.4z"
        fill="currentColor"
      />
      <path
        d="M41.6 6.2c2.4 1.4 4.2 3.6 5.2 6.4-3.2-.4-5.8-1.8-7.6-4.2 1-.8 1.8-1.5 2.4-2.2z"
        fill="var(--color-pepper)"
      />
    </svg>
  );
}

export function BrandLockup({
  light = false,
  compact = false,
}: {
  light?: boolean;
  compact?: boolean;
}) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <span
        className={cn(
          "grid place-items-center rounded-md bg-chili text-cream",
          compact ? "size-8" : "size-9",
        )}
      >
        <PepperMark className={compact ? "size-5" : "size-6"} />
      </span>
      <span className="leading-none">
        <span
          className={cn(
            "block font-display font-bold tracking-wide uppercase",
            compact ? "text-lg" : "text-xl",
            light ? "text-ink" : "text-fg",
          )}
        >
          Chili's
        </span>
        <span
          className={cn(
            "block text-[10px] font-semibold uppercase tracking-[0.18em]",
            light ? "text-subtle" : "text-muted",
          )}
        >
          AI Interview
        </span>
      </span>
    </span>
  );
}
