import { PageShell } from "@/components/layout/shell";
import { Badge } from "@/components/ui/badge";
import { Panel } from "@/components/ui/panel";
import { PRODUCTS } from "@/lib/products";

export const metadata = {
  title: "Research",
  description:
    "Method, cost model, contested specifications and limitations behind the Aurum IQ relative-value terminal.",
};

export default function ResearchPage() {
  return (
    <PageShell
      title="Methodology & Data"
      subtitle="What this terminal computes, what it charges itself, what it deliberately refuses to do — and which facts in the source material are still contested."
      actions={<Badge tone="outline">READ-ONLY BUILD</Badge>}
    >
      {/* Thesis */}
      <Panel eyebrow="Thesis" title="The gap you see is three gaps stacked">
        <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
          <div className="space-y-3 text-[0.875rem] leading-relaxed text-ash">
            <p>
              A screen shows Gold Petal trading at a premium to Gold Mini and calls it
              opportunity. Most of that premium is not opportunity: part of it is the
              999-versus-995 purity difference, part of it is the cost of carrying a later expiry,
              and only the remainder is dislocation.
            </p>
            <p>
              The terminal prices all three terms explicitly. Purity is fixed by contract
              specification, carry is read off the curve between the two matched expiry dates, and
              the residual — the only part that can move — is scored against its own 60-session
              history with the normalisers lagged one settlement so nothing looks ahead.
            </p>
            <p className="text-bone">
              Then the residual has to survive a toll booth: statutory charges, GST on brokerage,
              capped per-order brokerage and a modelled bid-ask on both legs. If 80% of the reversion
              does not clear that cost, no alert fires. On most days nothing fires.
            </p>
          </div>
          <div className="space-y-3">
            <div className="rounded-xs border border-line bg-ink-800 px-3.5 py-3">
              <p className="label-mono">Identity the page enforces</p>
              <p className="mt-1.5 font-mono text-[0.75rem] leading-relaxed text-gold-bright">
                naive = −purity + carry + residual
              </p>
              <p className="mt-1.5 text-[0.6875rem] leading-relaxed text-dim">
                Checked at runtime across five pairs; the data-quality panel reports the closure
                error, which stays at floating-point noise.
              </p>
            </div>
            <div className="rounded-xs border border-line bg-ink-800 px-3.5 py-3">
              <p className="label-mono">Decision rule</p>
              <p className="mt-1.5 font-mono text-[0.75rem] leading-relaxed text-gold-bright">
                0.8 × |residual| − roundTrip &gt; 0
              </p>
              <p className="mt-1.5 text-[0.6875rem] leading-relaxed text-dim">
                The 0.8 factor is a deliberate haircut: mean reversion rarely captures the whole
                move before the next expiry rolls in.
              </p>
            </div>
          </div>
        </div>
      </Panel>

      {/* Contracts */}
      <Panel
        eyebrow="Coverage"
        title="The five contracts, and where the sources disagree"
        description="Point-in-time specifications. Where public sources conflict, the value used here is shown with its caveat instead of being silently resolved."
      >
        <div className="scroll-thin -mx-4 overflow-x-auto sm:-mx-6 lg:mx-0">
          <table className="w-full min-w-[54rem] border-collapse text-sm">
            <thead>
              <tr className="border-b border-line">
                <Th className="text-left">Product</Th>
                <Th>Lot / quote</Th>
                <Th>Purity</Th>
                <Th className="text-left">Expiry rule</Th>
                <Th className="text-left">Listing</Th>
                <Th className="text-left">Book</Th>
                <Th className="text-left">Status</Th>
              </tr>
            </thead>
            <tbody>
              {PRODUCTS.map((product) => (
                <tr key={product.id} className="border-b border-line/70 last:border-0 align-top">
                  <Td className="text-left">
                    <span className="text-bone">{product.name}</span>
                    <span className="ml-2 font-mono text-[0.6875rem] text-dim">{product.id}</span>
                  </Td>
                  <Td>{product.unitGrams} g / {product.quoteGrams} g</Td>
                  <Td className="font-mono">{product.purity}</Td>
                  <Td className="text-left text-[0.75rem] text-ash">{product.expiryRule}</Td>
                  <Td className="text-left text-[0.75rem] text-ash">{product.listing}</Td>
                  <Td className="text-left">
                    <Badge tone={product.liquidity === "high" ? "up" : product.liquidity === "medium" ? "neutral" : "outline"}>
                      {product.liquidity.toUpperCase()}
                    </Badge>
                  </Td>
                  <Td className="text-left">
                    {product.caveat ? (
                      <Badge tone="warning" title={product.caveat}>
                        CONTESTED
                      </Badge>
                    ) : (
                      <Badge tone="outline">AGREED</Badge>
                    )}
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-4 space-y-2.5">
          {PRODUCTS.filter((product) => product.caveat).map((product) => (
            <p key={product.id} className="max-w-4xl text-[0.75rem] leading-relaxed text-dim">
              <span className="font-medium text-gold">{product.id}</span> — {product.caveat}
            </p>
          ))}
        </div>
      </Panel>

      {/* Method */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel eyebrow="Method" title="Seven rules, applied on every refresh">
          <ol className="space-y-3.5">
            {[
              {
                title: "Match expiries, not calendars",
                body: "Both legs are taken from their nearest contract that is still six or more days from expiry, so the tender window is never priced.",
              },
              {
                title: "Convert to fine gold first",
                body: "settle ÷ quoteGrams ÷ fineness gives ₹ per gram of deliverable metal. Only then are two products comparable.",
              },
              {
                title: "Strip purity, then carry",
                body: "ln(fineA/fineB) removes the 999-vs-995 wedge; the implied curve rate times the expiry gap removes financing.",
              },
              {
                title: "Lag every normaliser",
                body: "Mean, standard deviation, median and MAD all use settlements through t−1. The current reading is never part of its own baseline.",
              },
              {
                title: "Charge the round trip explicitly",
                body: "Statutory exchange charges, 18% GST on brokerage, capped per-order brokerage and a per-product bid-ask — summed on both legs.",
              },
              {
                title: "Gate with hysteresis",
                body: "Arm at |z| ≥ 2.0, require two consecutive settlements, disarm only below |z| 1.0. Fixed per-order costs are checked against notional, which is why 1 g legs usually fail.",
              },
              {
                title: "Trust nothing you did not test",
                body: "Walk-forward splits, out-of-sample-only equity, deflated Sharpe ratio across logged configurations and PBO via CSCV before anything is called robust.",
              },
            ].map((rule, index) => (
              <li key={rule.title} className="flex gap-3">
                <span className="mt-0.5 font-mono text-[0.6875rem] text-gold">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <div className="min-w-0">
                  <p className="text-[0.8125rem] text-bone">{rule.title}</p>
                  <p className="mt-0.5 max-w-prose text-[0.75rem] leading-relaxed text-dim">
                    {rule.body}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </Panel>

        <Panel
          eyebrow="Cost model"
          title="What the toll booth charges"
          description="Published slabs as modelled here; brokerage is capped per order, which is exactly what breaks small-lot signals."
        >
          <div className="space-y-3">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-line">
                  <Th className="text-left">Component</Th>
                  <Th>Modelled value</Th>
                  <Th className="text-left">Applies to</Th>
                </tr>
              </thead>
              <tbody>
                <Tr>
                  <Td className="text-left">Statutory turnover charges</Td>
                  <Td>≈ 1.8 bps</Td>
                  <Td className="text-left text-ash">Both legs, both sides</Td>
                </Tr>
                <Tr>
                  <Td className="text-left">Brokerage</Td>
                  <Td>min(₹20, 0.03%) × 2</Td>
                  <Td className="text-left text-ash">Per order, per leg</Td>
                </Tr>
                <Tr>
                  <Td className="text-left">GST on brokerage</Td>
                  <Td>18%</Td>
                  <Td className="text-left text-ash">Added to brokerage</Td>
                </Tr>
                <Tr>
                  <Td className="text-left">Bid/ask — GOLD, GOLDM</Td>
                  <Td>0.10 – 0.15 bps</Td>
                  <Td className="text-left text-ash">Deep books</Td>
                </Tr>
                <Tr>
                  <Td className="text-left">Bid/ask — GOLDTEN</Td>
                  <Td>1.2 bps</Td>
                  <Td className="text-left text-ash">Medium book</Td>
                </Tr>
                <Tr>
                  <Td className="text-left">Bid/ask — GOLDGUINEA</Td>
                  <Td>3.5 bps</Td>
                  <Td className="text-left text-ash">Thin book</Td>
                </Tr>
                <Tr>
                  <Td className="text-left">Bid/ask — GOLDPETAL</Td>
                  <Td>5.0 bps</Td>
                  <Td className="text-left text-ash">1 g retail contract</Td>
                </Tr>
              </tbody>
            </table>

            <div className="rounded-xs border border-line bg-ink-800 px-3.5 py-3">
              <p className="label-mono">Worked example — GOLDM vs GOLDPETAL</p>
              <p className="mt-1.5 text-[0.75rem] leading-relaxed text-ash">
                Petal&apos;s quoted premium sits well above the purity wedge, but a fixed ₹20
                brokerage on a 1 g leg is worth hundreds of basis points of that notional. The
                model converts every fixed charge into basis points at the actual leg size before
                it compares anything — that single step is what turns a screen-worthy gap into a
                quiet no-trade.
              </p>
            </div>
          </div>
        </Panel>
      </div>

      {/* Limits */}
      <Panel
        eyebrow="Limits"
        title="What this build does not claim"
        description="Stated plainly, because most relative-value demos quietly skip this section."
      >
        <div className="grid gap-x-6 gap-y-3.5 sm:grid-cols-2">
          {[
            ["Settlements, not fills",
             "Everything is daily settlement data — the bundled MCX bhavcopy or your own upload. No bid-ask ladder, no intraday path, no partial fills — a 30-minute VWAP print in a thin contract is not an executable price."],
            ["Short history caps the statistics",
             "The bundled file covers a single trading session (and until more days are uploaded, so does the working set). Z-scores, half-lives and backtests have little history to lean on — treat them as structure, not evidence."],
            ["Specs are contested",
             "Gold Guinea's per-gram quoting and purity are disputed across sources; Gold Ten's history starts 1 Apr 2025, capping every pair it appears in."],
            ["One dataset, one path",
             "A single scenario — synthetic or real — cannot establish that a signal is robust. The backtest lab says so in its own limitations list."],
            ["No execution model",
             "No queue position, no market impact, no roll slippage at expiry. The cost model prices entry and exit, not the journey between them."],
            ["Carry is implied, not observed",
             "The curve's implied rate is used for the residual. Where the curve is noisy, the carry term absorbs the noise and the residual is understated."],
            ["No order entry, ever",
             "This is a research terminal. There is no routing, no broker link and no position tracking — by design, not by omission."],
            ["Alerts are session-scoped",
             "Acknowledged and dismissed states live in memory; a reload restores the original feed."],
          ].map(([title, body]) => (
            <div key={title} className="border-l border-line pl-3.5">
              <p className="text-[0.8125rem] text-bone">{title}</p>
              <p className="mt-1 text-[0.75rem] leading-relaxed text-dim">{body}</p>
            </div>
          ))}
        </div>
      </Panel>

      {/* Data quality + API */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel eyebrow="Data quality" title="How the trust score is built">
          <div className="space-y-3 text-[0.8125rem] leading-relaxed text-ash">
            <p>
              Every loaded session of rows is re-checked on each refresh: dates match the requested
              settlement day, symbols are trimmed and de-duplicated, settlements are positive, open
              interest is non-negative, expiries point forward, and cross-contract prices agree with
              the GOLDM anchor.
            </p>
            <p>
              Stale rows — a settlement that printed with no volume — are the only dynamic input to
              the score:{" "}
              <span className="font-mono text-[0.75rem] text-gold-bright">
                100 − staleShare × 160 − 4
              </span>
              . They stay in the chart for honesty but are excluded from interpolation and from
              signal generation.
            </p>
            <p className="text-dim">
              The decomposition identity is also recomputed live across the monitored pairs and
              reported as a validator, so a silent regression in the arithmetic would show up as a
              failed check rather than a plausible-looking number.
            </p>
          </div>
        </Panel>

        <Panel
          eyebrow="Interface"
          title="Backend routes this UI is written against"
          description="Every panel is an HTTP call to the engine (same-origin /api/*), validated with Zod before it renders — the engine serves only what the uploaded CSV contains."
        >
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-line">
                <Th className="text-left">Route</Th>
                <Th className="text-left">Used by</Th>
              </tr>
            </thead>
            <tbody>
              {[
                ["GET /api/data/status", "Overview — trust score and validators"],
                ["GET /api/contracts", "Contracts table, watchlist, leg lookup"],
                ["GET /api/analytics/relative-value", "Spreads — series, summary, chart"],
                ["GET /api/analytics/term-structure", "Overview — forward curves"],
                ["GET /api/alerts", "Signals — the alert feed"],
                ["POST /api/backtests", "Signals — run a walk-forward backtest"],
                ["GET /api/backtests/:id", "Signals — re-fetch a stored run"],
              ].map(([route, usedBy]) => (
                <Tr key={route}>
                  <Td className="text-left font-mono text-[0.6875rem] text-gold">{route}</Td>
                  <Td className="text-left text-ash">{usedBy}</Td>
                </Tr>
              ))}
            </tbody>
          </table>
          <p className="mt-3 text-[0.6875rem] leading-relaxed text-dim">
            One knob: <span className="font-mono text-ash">NEXT_PUBLIC_API_BASE_URL</span>{" "}
            points the pages at the engine — leave it unset (or <span className="font-mono text-ash">same-origin</span>)
            to go through the same-origin proxy, or set an absolute URL for an external deployment.
          </p>
        </Panel>
      </div>

      {/* Glossary */}
      <Panel eyebrow="Glossary" title="Terms used across the terminal">
        <dl className="grid gap-x-6 gap-y-3.5 sm:grid-cols-2 lg:grid-cols-3">
          {[
            ["Residual basis", "ln(fineB/fineA) minus carry — the part of the premium that is neither quality nor financing."],
            ["z-score", "Distance from the rolling mean in rolling standard deviations, computed with data through t−1."],
            ["MAD z", "Robust alternative using the median and median absolute deviation × 1.4826 — resistant to stale prints."],
            ["Round trip", "Full cost of opening and closing both legs: statutory + GST + capped brokerage + modelled bid/ask."],
            ["Expected edge", "0.8 × |residual| − round trip. Negative means the trade is uneconomic regardless of conviction."],
            ["Half-life", "Sessions implied by an AR(1) fit to the residual: how long half the dislocation usually takes to fade."],
            ["Deflated Sharpe", "Sharpe haircut for the number of configurations tried — a search cannot be scored as if it were a single bet."],
            ["PBO (CSCV)", "Probability of backtest overfitting: how often the in-sample winner lands in the bottom half out of sample."],
            ["Power floor", "The smallest Sharpe this test design could have detected at 5% significance — below it, silence proves nothing."],
            ["Tender window", "The final days of a contract when delivery, not trading, dominates. All pairs here exclude it."],
          ].map(([term, definition]) => (
            <div key={term}>
              <dt className="text-[0.8125rem] text-bone">{term}</dt>
              <dd className="mt-0.5 text-[0.75rem] leading-relaxed text-dim">{definition}</dd>
            </div>
          ))}
        </dl>
      </Panel>
    </PageShell>
  );
}

function Th({ children, className = "text-right" }: { children: React.ReactNode; className?: string }) {
  return (
    <th scope="col" className={`label-mono px-2 py-2 font-normal ${className}`}>
      {children}
    </th>
  );
}

function Td({ children, className = "text-right" }: { children: React.ReactNode; className?: string }) {
  return <td className={`px-2 py-2.5 font-mono text-[0.75rem] tabular-nums text-ash ${className}`}>{children}</td>;
}

function Tr({ children }: { children: React.ReactNode }) {
  return <tr className="border-b border-line/70 last:border-0">{children}</tr>;
}
