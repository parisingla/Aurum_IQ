"use client";

import { useMemo } from "react";
import { PageShell, useRefreshNonce } from "@/components/layout/shell";
import { AsyncBoundary, PanelSkeleton } from "@/components/ui/states";
import { HeroSection } from "@/components/dashboard/hero";
import { MarketSnapshot } from "@/components/dashboard/market-snapshot";
import { SpreadInsight } from "@/components/dashboard/spread-insight";
import { RecentAnalyses } from "@/components/dashboard/recent-analyses";
import { ResearchTools } from "@/components/dashboard/research-tools";
import { useAsync } from "@/lib/hooks";
import { fetchDataStatus, fetchContracts, fetchRelativeValue } from "@/lib/api";

const DEFAULT_PAIR = { legA: "GOLDM", legB: "GOLDPETAL" } as const;

function monthYear(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString("en", { month: "short", year: "numeric" });
}

export default function OverviewPage() {
  const nonce = useRefreshNonce();

  const status = useAsync(() => fetchDataStatus(), [nonce]);
  const contracts = useAsync(() => fetchContracts({ sort: "expiry" }), [nonce]);
  const spread = useAsync(() => fetchRelativeValue({ ...DEFAULT_PAIR, range: "6M" }), [nonce]);

  const eligiblePairs = useMemo(() => {
    const rows = contracts.data ?? [];
    const live = new Set(
      rows.filter((row) => row.daysToExpiry >= 6).map((row) => row.productId),
    );
    const n = live.size;
    return n > 0 ? (n * (n - 1)) / 2 : null;
  }, [contracts.data]);

  const dataPeriod = useMemo(() => {
    const value = status.data;
    if (!value) return null;
    if (value.fromDate && value.toDate) {
      return `${monthYear(value.fromDate)} – ${monthYear(value.toDate)}`;
    }
    return monthYear(value.asOf);
  }, [status.data]);

  const dataReady = useMemo(() => {
    const value = status.data;
    if (!value) return true;
    const passed = value.checks.filter((check) => check.passed).length;
    return value.trustScore >= 80 && passed === value.checks.length;
  }, [status.data]);

  return (
    <PageShell>
      <HeroSection />

      <div className="mt-10 grid gap-4 lg:grid-cols-[0.95fr_1.15fr_1fr]">
        <MarketSnapshot
          contractsLoaded={contracts.data ? contracts.data.length : null}
          eligiblePairs={eligiblePairs}
          dataPeriod={dataPeriod}
          dataReady={dataReady}
          loading={status.loading || contracts.loading}
        />
        <AsyncBoundary
          loading={spread.loading}
          error={spread.error}
          data={spread.data}
          onRetry={spread.reload}
          skeleton={<PanelSkeleton rows={5} />}
        >
          {(series) => <SpreadInsight series={series} />}
        </AsyncBoundary>
        <RecentAnalyses />
      </div>

      <div className="mt-10">
        <ResearchTools />
      </div>
    </PageShell>
  );
}
