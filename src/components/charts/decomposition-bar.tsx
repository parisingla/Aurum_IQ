import { cn } from "@/lib/cn";
import { formatBps } from "@/lib/format";

interface Segment {
  label: string;
  valueBps: number;
  color: string;
  note?: string;
}

interface DecompositionBarProps {
  segments: Segment[];
  /** The number the segments must add up to — shown at the right of the bar. */
  totalLabel: string;
  totalValue: number;
}

/**
 * Stacked contribution bar. Widths are proportional to each term's magnitude
 * and the sign is carried by colour plus an explicit +/−, never colour alone.
 */
export function DecompositionBar({ segments, totalLabel, totalValue }: DecompositionBarProps) {
  const magnitude = segments.reduce((sum, segment) => sum + Math.abs(segment.valueBps), 0) || 1;

  return (
    <div>
      <div className="flex h-9 w-full overflow-hidden rounded-xs border border-line bg-ink-800">
        {segments.map((segment) => {
          const width = (Math.abs(segment.valueBps) / magnitude) * 100;
          return (
            <div
              key={segment.label}
              className="relative flex items-center justify-center overflow-hidden transition-[width] duration-500"
              style={{ width: `${width}%`, background: segment.color }}
              title={`${segment.label}: ${formatBps(segment.valueBps)}`}
            >
              <span className="truncate px-1 font-mono text-[0.625rem] font-medium text-ink-950/85">
                {width > 14 ? `${segment.label} ${formatBps(segment.valueBps, 0)}` : ""}
              </span>
            </div>
          );
        })}
      </div>

      <dl className="mt-3 grid gap-x-4 gap-y-2 sm:grid-cols-2 lg:grid-cols-4">
        {segments.map((segment) => (
          <div key={segment.label} className="flex items-baseline gap-2">
            <span
              aria-hidden="true"
              className="mt-0.5 inline-block size-2 shrink-0 rounded-[1px]"
              style={{ background: segment.color }}
            />
            <div className="min-w-0">
              <dt className="label-mono">{segment.label}</dt>
              <dd className="font-mono text-xs tabular-nums text-bone">
                {formatBps(segment.valueBps)}
                {segment.note && (
                  <span className="ml-1.5 font-sans text-[0.625rem] text-dim">{segment.note}</span>
                )}
              </dd>
            </div>
          </div>
        ))}
        <div className="flex items-baseline gap-2">
          <span aria-hidden="true" className="mt-0.5 inline-block size-2 shrink-0 rounded-[1px] bg-bone" />
          <div>
            <dt className="label-mono">{totalLabel}</dt>
            <dd className={cn("font-mono text-xs tabular-nums text-gold-bright")}>
              {formatBps(totalValue)}
            </dd>
          </div>
        </div>
      </dl>
    </div>
  );
}
