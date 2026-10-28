"use client";

import {
  ArrowRight,
  Coins,
  FileSpreadsheet,
  FlaskConical,
  LineChart,
  ShieldCheck,
  Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Panel } from "@/components/ui/panel";
import { useShell } from "@/components/layout/shell";

export type DatasetState = "loading" | "api" | "empty" | "offline";

/**
 * What the uploaded dataset unlocks — the terminal's actual edge, stated
 * plainly. Shown while the store is empty so the first screen sells the
 * method, not placeholder numbers.
 */
const WHAT_YOU_GET: Array<{ icon: typeof Coins; title: string; body: string }> = [
  {
    icon: Coins,
    title: "Purity-normalised spreads",
    body: "GOLD, GOLDM, GOLDTEN, GOLDGUINEA and GOLDPETAL quote different purities and lot sizes — every pair is restated to fine ₹/g before it is compared.",
  },
  {
    icon: LineChart,
    title: "Residual, carry and z-score",
    body: "The rupee gap is decomposed into purity, implied carry and a residual, then scored as a z-score with a MAD-scaled percentile.",
  },
  {
    icon: ShieldCheck,
    title: "The cost hurdle, charged first",
    body: "A full round-trip — brokerage, modelled bid-ask, statutory levies — is subtracted before anything is called an edge. Expected edge is shown net.",
  },
  {
    icon: FlaskConical,
    title: "Walk-forward backtests that can say no",
    body: "Train/test splits with deflated Sharpe and probability of backtest overfitting — a thin dataset gets told it has no edge rather than flattered.",
  },
];

/** Full-page gate shown until a CSV is uploaded: no fake numbers, ever. */
export function DatasetGate({
  state,
  detail,
}: {
  state: Exclude<DatasetState, "api">;
  detail?: string;
}) {
  const { setUploadOpen } = useShell();

  const headline =
    state === "loading"
      ? "Connecting to the engine…"
      : state === "offline"
        ? "Engine not connected"
        : "No dataset loaded";

  const body =
    state === "loading"
      ? "Checking what the analytics engine is serving…"
      : state === "offline"
        ? "The app answers only from the AURUM IQ engine (no bundled demo data). Set NEXT_PUBLIC_API_BASE_URL=same-origin so the pages can reach it."
        : "This terminal refuses to invent a market. Upload a date-wise MCX bhavcopy CSV — the gold family's rows are validated, normalised and served everywhere within seconds.";

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6">
      <Panel eyebrow="Start here" title={headline} description={body}>
        {state === "empty" && (
          <Button
            size="md"
            variant="primary"
            icon={<Upload className="size-4" aria-hidden="true" />}
            onClick={() => setUploadOpen(true)}
          >
            Upload Data (CSV)
          </Button>
        )}
        {state === "offline" && detail && (
          <p className="rounded-xs border border-down/30 bg-down/10 px-3 py-2 font-mono text-xs text-down">
            {detail}
          </p>
        )}

        <div className="mt-6 border-t border-line pt-5">
          <p className="label-mono">What the upload unlocks</p>
          <div className="mt-3 grid gap-x-6 gap-y-4 sm:grid-cols-2">
            {WHAT_YOU_GET.map((item) => (
              <div key={item.title} className="flex items-start gap-3">
                <item.icon className="mt-0.5 size-4 shrink-0 text-metallic-gold" aria-hidden="true" />
                <div className="min-w-0">
                  <p className="text-[0.8125rem] text-bone">{item.title}</p>
                  <p className="mt-0.5 text-[0.75rem] leading-relaxed text-dim">{item.body}</p>
                </div>
              </div>
            ))}
          </div>
          <p className="mt-4 flex items-center gap-1.5 text-[0.6875rem] text-dim">
            <FileSpreadsheet className="size-3.5" aria-hidden="true" />
            Date-wise bhavcopy (27 Oct 2026 style) · option rows are skipped automatically
            <ArrowRight className="size-3" aria-hidden="true" />
            only real settlements are ever served
          </p>
        </div>
      </Panel>
    </div>
  );
}
