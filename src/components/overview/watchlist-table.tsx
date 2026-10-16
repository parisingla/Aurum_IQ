"use client";

import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/cn";
import { EmptyState } from "@/components/ui/states";
import {
  formatDateShort,
  formatLots,
  formatPrice,
  formatSigned,
  toneClass,
} from "@/lib/format";
import type { WatchRow } from "@/lib/types";

const LIQUIDITY_TONE = {
  high: "up",
  medium: "neutral",
  low: "outline",
} as const;

/** Front contract per product — the desk's "what am I watching" strip. */
export function WatchlistTable({ rows }: { rows: WatchRow[] }) {
  const router = useRouter();

  if (rows.length === 0) {
    return <EmptyState title="No live contracts" hint="The fixture set has no front month right now." />;
  }

  return (
    <div className="scroll-thin -mx-4 overflow-x-auto sm:-mx-6 lg:mx-0">
      <table className="w-full min-w-[46rem] border-collapse text-sm">
        <thead>
          <tr className="border-b border-line">
            <th scope="col" className="label-mono px-4 py-2 text-left font-normal sm:px-6 lg:px-4">
              Product / front
            </th>
            <th scope="col" className="label-mono px-2 py-2 text-right font-normal">Expiry</th>
            <th scope="col" className="label-mono px-2 py-2 text-right font-normal">Settle</th>
            <th scope="col" className="label-mono px-2 py-2 text-right font-normal">Δ session</th>
            <th scope="col" className="label-mono px-2 py-2 text-right font-normal">Fine ₹/g</th>
            <th scope="col" className="label-mono px-2 py-2 text-right font-normal">Volume</th>
            <th scope="col" className="label-mono px-2 py-2 text-right font-normal">Open int.</th>
            <th scope="col" className="label-mono px-2 py-2 text-right font-normal">DTE</th>
            <th scope="col" className="label-mono px-4 py-2 text-right font-normal sm:px-6 lg:px-4">Book</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.productId}
              className="group cursor-pointer border-b border-line/70 transition-colors last:border-0 hover:bg-ink-800/70"
              onClick={() => router.push(`/contracts?product=${row.productId}`)}
            >
              <td className="px-4 py-2.5 sm:px-6 lg:px-4">
                <span className="flex items-center gap-2">
                  <span className="text-[0.8125rem] text-bone">{row.name}</span>
                  <span className="font-mono text-[0.6875rem] text-dim">{row.contractCode}</span>
                  {row.stale && (
                    <Badge tone="warning" title="Zero-volume settlement in the last session">
                      STALE
                    </Badge>
                  )}
                </span>
              </td>
              <td className="px-2 py-2.5 text-right font-mono text-xs tabular-nums text-ash">
                {formatDateShort(row.expiry)}
              </td>
              <td className="px-2 py-2.5 text-right font-mono text-xs tabular-nums text-bone">
                {formatPrice(row.settle)}
              </td>
              <td className={cn("px-2 py-2.5 text-right font-mono text-xs tabular-nums", toneClass(row.changeAbs))}>
                {formatSigned(row.changeAbs, 0)} · {formatSigned(row.changePct, 2, "%")}
              </td>
              <td className="px-2 py-2.5 text-right font-mono text-xs tabular-nums text-ash">
                {formatPrice(row.finePerGram)}
              </td>
              <td className="px-2 py-2.5 text-right font-mono text-xs tabular-nums text-ash">
                {formatLots(row.volumeLots)}
              </td>
              <td className="px-2 py-2.5 text-right font-mono text-xs tabular-nums text-ash">
                {formatLots(row.openInterestLots)}
              </td>
              <td className="px-2 py-2.5 text-right font-mono text-xs tabular-nums text-dim">
                {row.daysToExpiry}d
              </td>
              <td className="px-4 py-2.5 text-right sm:px-6 lg:px-4">
                <Badge tone={LIQUIDITY_TONE[row.liquidity]} title={`Modelled book depth: ${row.liquidity}`}>
                  {row.liquidity.toUpperCase()}
                </Badge>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}