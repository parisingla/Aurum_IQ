import { productSpec } from "@/lib/products";
import type { Contract } from "@/lib/types";
import { formatPrice } from "@/lib/format";
import { Badge } from "@/components/ui/badge";

/** One leg of the pair — the contract actually being priced, not the product. */
export function LegCard({
  contract,
  side,
  highlighted,
}: {
  contract: Contract;
  side: "A" | "B";
  highlighted?: boolean;
}) {
  const spec = productSpec(contract.productId);
  const change = contract.settle - contract.prevSettle;

  return (
    <article
      className={
        "flex min-w-0 flex-col gap-3 rounded-md border bg-ink-850 p-4 " +
        (highlighted ? "border-gold/40" : "border-line")
      }
    >
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="label-mono">Leg {side}</p>
          <h3 className="mt-0.5 flex flex-wrap items-baseline gap-2">
            <span className="text-sm text-bone">{spec.name}</span>
            <span className="font-mono text-xs text-gold">{contract.contractCode}</span>
          </h3>
        </div>
        <Badge tone={contract.stale ? "warning" : "outline"}>
          {contract.stale ? "STALE" : `${contract.daysToExpiry}d TO EXPIRY`}
        </Badge>
      </header>

      <div className="grid grid-cols-3 gap-x-3 gap-y-2.5">
        <Cell label="Settle" value={formatPrice(contract.settle)} />
        <Cell
          label="Δ session"
          value={change >= 0 ? `+${formatPrice(change)}` : `−${formatPrice(Math.abs(change))}`}
          tone={change > 0 ? "text-up" : change < 0 ? "text-down" : "text-ash"}
        />
        <Cell label="Fine ₹/g" value={formatPrice(contract.finePerGram)} />
        <Cell label="Quote unit" value={`${spec.quoteGrams} g`} />
        <Cell label="Purity" value={`${spec.purity}`} />
        <Cell label="Volume" value={`${contract.volumeLots.toLocaleString("en-IN")} lots`} />
      </div>

      <p className="border-t border-line pt-2.5 text-[0.6875rem] leading-relaxed text-dim">
        {spec.expiryRule} · lot {spec.unitGrams} g · tick ₹{spec.tickInr}
      </p>
    </article>
  );
}

function Cell({ label, value, tone = "text-bone" }: { label: string; value: string; tone?: string }) {
  return (
    <div className="min-w-0">
      <p className="label-mono">{label}</p>
      <p className={`mt-0.5 truncate font-mono text-[0.8125rem] tabular-nums ${tone}`}>{value}</p>
    </div>
  );
}
