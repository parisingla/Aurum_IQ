import type { ProductId, ProductSpec } from "./types";

/**
 * Point-in-time contract specifications for the five MCX gold futures the
 * product covers. Values are transcribed from the research notes; entries
 * marked `caveat` are contested in the public sources and are surfaced in the
 * UI rather than quietly resolved.
 */
export const PRODUCTS: readonly ProductSpec[] = [
  {
    id: "GOLD",
    name: "Gold",
    unitGrams: 1000,
    quoteGrams: 10,
    fineness: 0.995,
    purity: 995,
    tickInr: 1,
    tickValueInr: 100,
    expiryBand: "fifth",
    expiryRule: "5th of the contract month (preceding working day if a holiday)",
    listing: "Bimonthly — Feb / Apr / Jun / Aug / Oct / Dec",
    liquidity: "high",
    delivery: "Ahmedabad (base), Mumbai and New Delhi as additional centres",
    listedSince: "Long-standing",
    blurb:
      "The 1 kg reference contract. Bullion desks, importers and hedgers trade here; it is the natural curve anchor.",
  },
  {
    id: "GOLDM",
    name: "Gold Mini",
    unitGrams: 100,
    quoteGrams: 10,
    fineness: 0.995,
    purity: 995,
    tickInr: 1,
    tickValueInr: 10,
    expiryBand: "fifth",
    expiryRule: "5th of the contract month (preceding working day if a holiday)",
    listing: "Monthly",
    liquidity: "high",
    delivery: "Ahmedabad (base), Mumbai and New Delhi as additional centres",
    listedSince: "Long-standing",
    blurb:
      "100 g, quoted per 10 g at 995 purity. The most liquid gold contract and the reference leg for most pairs here.",
  },
  {
    id: "GOLDTEN",
    name: "Gold Ten",
    unitGrams: 10,
    quoteGrams: 10,
    fineness: 0.999,
    purity: 999,
    tickInr: 1,
    tickValueInr: 1,
    expiryBand: "monthEnd",
    expiryRule: "Last calendar day (preceding working day if a holiday)",
    listing: "Monthly — 6 listed since 22 Sep 2025",
    liquidity: "medium",
    delivery: "Ahmedabad (base), New Delhi and Mumbai",
    listedSince: "1 Apr 2025",
    caveat:
      "History starts 1 Apr 2025, so any pair involving GOLDTEN has a hard ceiling on observations. One 2025 expiry landed on a business day, not the calendar month end.",
    blurb:
      "10 g, 999 purity, quoted per 10 g. Newest of the five — shared history with older contracts is limited.",
  },
  {
    id: "GOLDGUINEA",
    name: "Gold Guinea",
    unitGrams: 8,
    quoteGrams: 8,
    fineness: 0.999,
    purity: 999,
    tickInr: 1,
    tickValueInr: 0.8,
    expiryBand: "monthEnd",
    expiryRule: "Last calendar day (preceding working day if a holiday)",
    listing: "Monthly — 6 listed since 22 Sep 2025",
    liquidity: "low",
    delivery: "Ahmedabad",
    listedSince: "Long-standing",
    caveat:
      "Contested in the sources: ICICI quotes it per 1 g, older MCX delivery records describe 995 coins, and the 999 DDR text may belong to NSE's mirror contract. This build uses ₹/8 g and 999 as a config value.",
    blurb:
      "8 g, quoted per 8 g. Thinnest book of the five — its settlements go stale often, which is exactly what the trust score watches.",
  },
  {
    id: "GOLDPETAL",
    name: "Gold Petal",
    unitGrams: 1,
    quoteGrams: 1,
    fineness: 0.999,
    purity: 999,
    tickInr: 1,
    tickValueInr: 0.1,
    expiryBand: "monthEnd",
    expiryRule: "Last calendar day (preceding working day if a holiday)",
    listing: "Monthly — 6 listed since 22 Sep 2025",
    liquidity: "medium",
    delivery: "Mumbai, with Ahmedabad and New Delhi as additional centres",
    listedSince: "Long-standing",
    caveat:
      "High lot counts disguise tiny notional: one lot is 1 g. Fixed per-order costs dominate, which is why most petal signals die at the cost hurdle.",
    blurb:
      "1 g retail contract. Lots pile up in the volume tables while the notional stays small — a classic trap for raw price-gap screens.",
  },
] as const;

export const PRODUCT_MAP: Record<ProductId, ProductSpec> = PRODUCTS.reduce(
  (acc, product) => {
    acc[product.id] = product;
    return acc;
  },
  {} as Record<ProductId, ProductSpec>,
);

export const PRODUCT_IDS: readonly ProductId[] = PRODUCTS.map((p) => p.id);

export function productSpec(id: ProductId): ProductSpec {
  return PRODUCT_MAP[id];
}

/** Round to the contract's own tick so displayed prices look tradable. */
export function toTick(value: number, tick: number): number {
  return Math.round(value / tick) * tick;
}
