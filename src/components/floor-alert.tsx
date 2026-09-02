import { Siren } from "lucide-react";
import type { FloorPrompt } from "@/lib/scenarios";
import { Button } from "./ui/button";

export function FloorAlert({
  prompt,
  index,
  total,
  onAnswer,
}: {
  prompt: FloorPrompt;
  index: number;
  total: number;
  onAnswer: (choiceId: string) => void;
}) {
  return (
    <div className="fixed inset-0 z-40 grid place-items-end bg-ink/40 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:place-items-center">
      <div className="w-full max-w-md rounded-xl bg-surface p-5 shadow-card animate-rise sm:p-6">
        <div className="flex items-center justify-between gap-3">
          <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-chili">
            <Siren className="size-3.5" />
            Floor call {index + 1} / {total}
          </span>
        </div>
        <h2 className="mt-3 font-display text-3xl font-bold uppercase text-fg">
          {prompt.title}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-muted">{prompt.body}</p>
        <div className="mt-5 flex flex-col gap-2">
          {prompt.choices.map((c) => (
            <Button
              key={c.id}
              type="button"
              variant="secondary"
              className="h-auto min-h-12 w-full justify-start rounded-lg whitespace-normal py-3 text-left"
              onClick={() => onAnswer(c.id)}
            >
              {c.label}
            </Button>
          ))}
        </div>
        <p className="mt-3 text-xs text-subtle">
          Answer without dropping the interview. This is the rush test.
        </p>
      </div>
    </div>
  );
}
