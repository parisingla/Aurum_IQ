"use client";

import { useRefreshNonce } from "@/components/layout/shell";
import { Badge } from "@/components/ui/badge";
import { fetchDataStatus } from "@/lib/api";
import { useAsync } from "@/lib/hooks";

/**
 * Header badge that tells the truth about the data actually being served:
 * the engine reports whether real uploaded settlements are live, no dataset
 * has been uploaded yet, or the engine cannot be reached at all. Re-renders
 * on the top-bar refresh.
 */
export function DataModeBadge() {
  const refreshNonce = useRefreshNonce();
  const status = useAsync(() => fetchDataStatus(), [refreshNonce]);

  if (status.data?.source === "api") {
    return <Badge tone="info">LIVE MCX DATA</Badge>;
  }
  if (status.data?.source === "empty") {
    return <Badge tone="warning">NO DATASET YET</Badge>;
  }
  return <Badge tone="warning">ENGINE OFFLINE</Badge>;
}
