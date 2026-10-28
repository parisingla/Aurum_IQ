"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Check, X } from "lucide-react";
import { PageShell, useRefreshNonce } from "@/components/layout/shell";
import { Badge } from "@/components/ui/badge";
import { DataModeBadge } from "@/components/ui/data-mode-badge";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Panel } from "@/components/ui/panel";
import { SearchField, SelectField } from "@/components/ui/field";
import { Segmented } from "@/components/ui/segmented";
import { AsyncBoundary, EmptyState } from "@/components/ui/states";
import { HistoryChart } from "@/components/charts/history-chart";
import { useAsync, useDebouncedValue } from "@/lib/hooks";
import { fetchContractHistory, fetchContracts } from "@/lib/api";
import { contractQuerySchema, parseInput, type ContractQuery } from "@/lib/validation";
import { PRODUCT_IDS, productSpec } from "@/lib/products";
import type { Contract, ProductId } from "@/lib/types";
import {
  formatCompactInr,
  formatDate,
  formatLots,
  formatPrice,
  formatSigned,
  toneClass,
} from "@/lib/format";

type ProductFilter = "ALL" | ProductId;
type SortKey = ContractQuery["sort"];

const PRODUCT_OPTIONS: ReadonlyArray<{ value: ProductFilter; label: string }> = [
  { value: "ALL", label: "All" },
  ...PRODUCT_IDS.map((id) => ({ value: id, label: id })),
];

const SORT_OPTIONS: ReadonlyArray<{ value: SortKey; label: string }> = [
  { value: "expiry", label: "Expiry (nearest)" },
  { value: "volume", label: "Volume (high → low)" },
  { value: "oi", label: "Open interest" },
  { value: "settle", label: "Settle (high → low)" },
];

export function ContractExplorer() {
  const nonce = useRefreshNonce();
  const router = useRouter();
  const params = useSearchParams();

  const [product, setProduct] = useState<ProductFilter>(
    (params.get("product") as ProductFilter | null) ?? "ALL",
  );
  const [sort, setSort] = useState<SortKey>("expiry");
  const [staleOnly, setStaleOnly] = useState(false);
  const [rawSearch, setRawSearch] = useState(params.get("q") ?? "");
  const search = useDebouncedValue(rawSearch, 200);
  const [selected, setSelected] = useState<string | null>(null);

  const query = useMemo(() => {
    const parsed = parseInput(contractQuerySchema, {
      product: product === "ALL" ? undefined : product,
      search,
      staleOnly,
      sort,
    });
    return parsed.ok ? parsed.data : null;
  }, [product, search, staleOnly, sort]);

  const contracts = useAsync(
    () => fetchContracts(query ?? { sort }),
    [query?.product, query?.search, query?.staleOnly, query?.sort, nonce],
  );

  const openContract = useMemo(
    () => contracts.data?.find((contract) => contract.id === selected) ?? null,
    [contracts.data, selected],
  );

  const clearFilters = () => {
    setProduct("ALL");
    setStaleOnly(false);
    setRawSearch("");
    setSort("expiry");
  };

  const filtersActive = product !== "ALL" || staleOnly || rawSearch.length > 0;

  return (
    <PageShell
      title="Contract Explorer"
      subtitle="Every live row across the five gold products: settle, fine-gold restatement, liquidity and staleness. Click a row for the full record and the tender window."
      actions={<DataModeBadge />}
    >
      <Panel padded={false}>
        <div className="flex flex-wrap items-end gap-3 border-b border-line px-4 py-3.5">
          <div className="min-w-[13rem]">
            <Segmented
              ariaLabel="Filter by product"
              value={product}
              onChange={setProduct}
              options={PRODUCT_OPTIONS}
              size="md"
            />
            <p className="label-mono mt-1.5">Product</p>
          </div>
          <SearchField
            id="contract-search"
            label="Find contract"
            className="w-44"
            value={rawSearch}
            onChange={setRawSearch}
            placeholder="GOLDM29OCT26"
          />
          <SelectField
            id="contract-sort"
            label="Sort by"
            className="w-44"
            value={sort}
            onChange={setSort}
            options={SORT_OPTIONS}
          />
          <button
            type="button"
            role="switch"
            aria-checked={staleOnly}
            onClick={() => setStaleOnly((value) => !value)}
            className={
              "flex h-8 items-center gap-2 rounded-xs border px-2.5 text-xs transition-colors " +
              (staleOnly
                ? "border-gold/50 bg-gold/10 text-gold-bright"
                : "border-line-strong bg-ink-800 text-dim hover:text-ash")
            }
          >
            <span
              aria-hidden="true"
              className={
                "flex size-3.5 items-center justify-center rounded-[1px] border " +
                (staleOnly ? "border-gold bg-gold text-ink-950" : "border-line-strong")
              }
            >
              {staleOnly && <Check className="size-2.5" strokeWidth={3} />}
            </span>
            Zero-volume only
          </button>
          {filtersActive && (
            <Button size="sm" variant="ghost" onClick={clearFilters} icon={<X className="size-3.5" />}>
              Clear
            </Button>
          )}
          <p className="label-mono ml-auto">
            {contracts.data ? `${contracts.data.length} rows` : "…"}
          </p>
        </div>

        <div className="p-4">
          <AsyncBoundary
            loading={contracts.loading}
            error={contracts.error}
            data={contracts.data}
            onRetry={contracts.reload}
            empty={{
              title: "No contracts match these filters",
              hint: "Try another product, clear the zero-volume filter, or search by contract code.",
            }}
          >
            {(rows) => (
              <div className="scroll-thin -mx-4 overflow-x-auto sm:-mx-6 lg:mx-0">
                <table className="w-full min-w-[56rem] border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-line">
                      <Head className="text-left">Contract</Head>
                      <Head className="text-left">Product</Head>
                      <Head>Expiry</Head>
                      <Head>DTE</Head>
                      <Head>Settle</Head>
                      <Head>Δ session</Head>
                      <Head>Fine ₹/g</Head>
                      <Head>Volume</Head>
                      <Head>Open int.</Head>
                      <Head>Turnover</Head>
                      <Head className="text-right">State</Head>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((contract) => (
                      <tr
                        key={contract.id}
                        tabIndex={0}
                        role="button"
                        aria-label={`Open ${contract.contractCode} detail`}
                        onClick={() => setSelected(contract.id)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            setSelected(contract.id);
                          }
                        }}
                        className="cursor-pointer border-b border-line/70 transition-colors last:border-0 hover:bg-ink-800/70 focus-visible:bg-ink-800"
                      >
                        <td className="px-2 py-2.5 font-mono text-xs text-bone">{contract.contractCode}</td>
                        <td className="px-2 py-2.5 text-[0.8125rem] text-ash">
                          {productSpec(contract.productId).name}
                        </td>
                        <td className="px-2 py-2.5 text-right font-mono text-xs tabular-nums text-ash">
                          {formatDate(contract.expiry)}
                        </td>
                        <td className="px-2 py-2.5 text-right font-mono text-xs tabular-nums text-dim">
                          {contract.daysToExpiry}d
                        </td>
                        <td className="px-2 py-2.5 text-right font-mono text-xs tabular-nums text-bone">
                          {formatPrice(contract.settle)}
                        </td>
                        <td
                          className={
                            "px-2 py-2.5 text-right font-mono text-xs tabular-nums " +
                            toneClass(contract.settle - contract.prevSettle)
                          }
                        >
                          {formatSigned(contract.settle - contract.prevSettle, 0)}
                        </td>
                        <td className="px-2 py-2.5 text-right font-mono text-xs tabular-nums text-ash">
                          {formatPrice(contract.finePerGram)}
                        </td>
                        <td className="px-2 py-2.5 text-right font-mono text-xs tabular-nums text-ash">
                          {formatLots(contract.volumeLots)}
                        </td>
                        <td className="px-2 py-2.5 text-right font-mono text-xs tabular-nums text-ash">
                          {formatLots(contract.openInterestLots)}
                        </td>
                        <td className="px-2 py-2.5 text-right font-mono text-xs tabular-nums text-dim">
                          {formatCompactInr(contract.valueLakh * 1e5)}
                        </td>
                        <td className="px-2 py-2.5 text-right">
                          {contract.stale ? (
                            <Badge tone="warning">STALE</Badge>
                          ) : contract.daysToExpiry <= 6 ? (
                            <Badge tone="critical">TENDER</Badge>
                          ) : (
                            <Badge tone="outline">LIVE</Badge>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </AsyncBoundary>
        </div>
      </Panel>

      <ContractDrawer
        contract={openContract}
        onClose={() => setSelected(null)}
        onOpenSpreads={(id) => {
          const legA = id === "GOLDM" ? "GOLD" : "GOLDM";
          router.push(`/spreads?legA=${legA}&legB=${id}`);
          setSelected(null);
        }}
      />
    </PageShell>
  );
}

function Head({
  children,
  className = "text-right",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <th scope="col" className={`label-mono px-2 py-2 font-normal ${className}`}>
      {children}
    </th>
  );
}

function ContractDrawer({
  contract,
  onClose,
  onOpenSpreads,
}: {
  contract: Contract | null;
  onClose: () => void;
  onOpenSpreads: (productId: ProductId) => void;
}) {
  const nonce = useRefreshNonce();
  const history = useAsync(
    () => (contract ? fetchContractHistory(contract.id) : Promise.resolve([])),
    [contract?.id, nonce],
  );

  if (!contract) return null;
  const spec = productSpec(contract.productId);
  const changeAbs = contract.settle - contract.prevSettle;

  return (
    <Modal
      open
      onClose={onClose}
      title={`${contract.contractCode} — ${spec.name}`}
      description={`Settled ${formatDate(contract.tradeDate)} · expiry ${formatDate(contract.expiry)}`}
      footer={
        <>
          <Button variant="ghost" size="sm" onClick={onClose}>
            Close
          </Button>
          <Button variant="primary" size="sm" onClick={() => onOpenSpreads(contract.productId)}>
            Compare in spreads
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        <div className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3">
          <Stat label="Settle" value={formatPrice(contract.settle)} strong />
          <Stat
            label="Δ session"
            value={formatSigned(changeAbs, 0)}
            tone={toneClass(changeAbs)}
          />
          <Stat label="Prev settle" value={formatPrice(contract.prevSettle)} />
          <Stat label="Open" value={formatPrice(contract.open)} />
          <Stat label="High" value={formatPrice(contract.high)} />
          <Stat label="Low" value={formatPrice(contract.low)} />
          <Stat label="Fine ₹/g" value={formatPrice(contract.finePerGram)} />
          <Stat label="Quoted ₹/g" value={formatPrice(contract.quotedPerGram)} />
          <Stat label="Days to expiry" value={`${contract.daysToExpiry}d`} />
          <Stat label="Volume (lots)" value={formatLots(contract.volumeLots)} />
          <Stat label="Open interest" value={formatLots(contract.openInterestLots)} />
          <Stat label="Turnover" value={formatCompactInr(contract.valueLakh * 1e5)} />
        </div>

        <section className="rounded-xs border border-line bg-ink-800 p-3">
          <div className="flex items-center justify-between gap-2">
            <p className="label-mono">Delivery window</p>
            {contract.stale && <Badge tone="warning">NO TRADE TODAY</Badge>}
          </div>
          <dl className="mt-2 space-y-1.5 text-[0.75rem]">
            <Row label="Last trading day" value={formatDate(contract.lastTradingDay)} />
            <Row label="Tender starts" value={formatDate(contract.tenderStart)} />
            <Row label="Quote unit" value={`${spec.quoteGrams} g at ${spec.purity} purity`} />
            <Row label="Lot size" value={`${spec.unitGrams} g`} />
            <Row label="Tick" value={`₹${spec.tickInr} · ₹${spec.tickValueInr} tick value`} />
            <Row label="Expiry rule" value={spec.expiryRule} />
          </dl>
        </section>

        <section>
          <div className="flex items-center justify-between gap-2">
            <p className="label-mono">Settlement history (60 sessions)</p>
            {history.loading && <span className="label-mono">loading…</span>}
          </div>
          <div className="mt-2 h-24">
            {history.data && history.data.length > 0 ? (
              <HistoryChart points={history.data} />
            ) : (
              <EmptyState
                compact
                title="No history endpoint"
                hint="Contract-level history is not part of the documented API surface; the bundled fixture supplies it when running in demo mode."
              />
            )}
          </div>
        </section>

        <section>
          <p className="label-mono">Product notes</p>
          <p className="mt-1.5 text-[0.8125rem] leading-relaxed text-ash">{spec.blurb}</p>
          {spec.caveat && (
            <p className="mt-2 rounded-xs border border-gold/30 bg-gold/5 px-3 py-2 text-[0.75rem] leading-relaxed text-gold">
              <span className="font-medium">Caveat:</span> {spec.caveat}
            </p>
          )}
        </section>
      </div>
    </Modal>
  );
}

function Stat({
  label,
  value,
  tone = "text-bone",
  strong,
}: {
  label: string;
  value: string;
  tone?: string;
  strong?: boolean;
}) {
  return (
    <div>
      <p className="label-mono">{label}</p>
      <p className={`font-mono text-sm tabular-nums ${strong ? "text-lg text-gold-bright" : tone}`}>
        {value}
      </p>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-dim">{label}</dt>
      <dd className="text-right font-mono text-[0.6875rem] text-ash">{value}</dd>
    </div>
  );
}
