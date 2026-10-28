import type { CalcStep } from "@/lib/analytics";
import { cn } from "@/lib/cn";

const TONES: Record<NonNullable<CalcStep["tone"]>, string> = {
  neutral: "text-bone",
  positive: "text-up",
  negative: "text-down",
  muted: "text-ash",
};

/**
 * The calculation, written out. Each row shows the formula, the substitution
 * with real numbers, and the result — the whole page can be audited by eye.
 */
export function CalcExplainer({ steps }: { steps: CalcStep[] }) {
  return (
    <ol className="space-y-0">
      {steps.map((step, index) => (
        <li
          key={step.id}
          className="grid grid-cols-1 gap-x-6 gap-y-1.5 border-b border-line/70 py-3.5 last:border-0 sm:grid-cols-[1.6fr_1fr_auto]"
        >
          <div className="min-w-0">
            <p className="flex items-baseline gap-2 text-[0.8125rem] text-bone">
              <span className="font-mono text-[0.625rem] text-gold">
                {String(index + 1).padStart(2, "0")}
              </span>
              {step.label}
            </p>
            <p className="mt-1 font-mono text-[0.6875rem] leading-relaxed text-dim">{step.formula}</p>
            {step.note && (
              <p className="mt-1 max-w-prose text-[0.6875rem] leading-relaxed text-dim">{step.note}</p>
            )}
          </div>
          <p className="min-w-0 self-start font-mono text-[0.6875rem] leading-relaxed text-ash break-words sm:pt-1">
            {step.substitution}
          </p>
          <p
            className={cn(
              "self-start whitespace-nowrap font-mono text-sm tabular-nums sm:text-right sm:pt-0.5",
              TONES[step.tone ?? "neutral"],
            )}
          >
            {step.result}
          </p>
        </li>
      ))}
    </ol>
  );
}
