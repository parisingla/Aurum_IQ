"use client";

import { useRefreshNonce } from "@/components/layout/shell";
import { Badge } from "@/components/ui/badge";
import { fetchDataStatus, isLiveApi } from "@/lib/api";
import { useAsync } from "@/lib/hooks";

/**
 * Header badge that tells the truth about the data actually being served:
 * the engine reports which market it answers from (real MCX settlements —
 * bundled bhavcopy or an upload — vs the synthetic fallback), and the badge
 * mirrors it. Re-renders on the top-bar refresh.
 */
export function DataModeBadge() {
  const refreshNonce = useRefreshNonce();
  const status = useAsync(
    () => (isLiveApi ? fetchDataStatus() : Promise.resolve(null)),
    [refreshNonce],
  );

  if (status.data?.source === "api") {
    return <Badge tone="info">LIVE MCX DATA</Badge>;
  }
  return <Badge tone="warning">DEMO FIXTURES</Badge>;
}
