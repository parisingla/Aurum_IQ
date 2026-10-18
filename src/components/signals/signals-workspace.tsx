"use client";

import { Bell, Filter } from "lucide-react";
import { PageShell, useRefreshNonce } from "@/components/layout/shell";
import { Badge } from "@/components/ui/badge";
import { Panel } from "@/components/ui/panel";
import { Segmented } from "@/components/ui/segmented";
import { AsyncBoundary } from "@/components/ui/states";
import { useToast } from "@/components/ui/toast";
import { AlertCard, useAlertFeed } from "@/components/signals/alert-card";
import { BacktestPanel } from "@/components/signals/backtest-panel";
import { useAsync } from "@/lib/hooks";
import { fetchAlerts } from "@/lib/api";
import type { Alert } from "@/lib/types";

export function SignalsWorkspace() {
  const nonce = useRefreshNonce();
  const { push } = useToast();
  const alerts = useAsync(() => fetchAlerts(), [nonce]);
  const feed = useAlertFeed(alerts.data ?? []);

  function act(alert: Alert, action: "acknowledged" | "dismissed") {
    feed.act(alert, action);
    push({
      tone: "success",
      title: action === "acknowledged" ? "Alert acknowledged" : "Alert dismissed",
      description:
        action === "acknowledged"
          ? `${alert.pairLabel} stays on the board until the z-score re-arms.`
          : `${alert.pairLabel} is hidden for this session — a fresh run brings it back if the gate re-fires.`,
    });
  }

  const armedCount = (alerts.data ?? []).filter((alert) => alert.severity !== "info").length;

  return (
    <PageShell
      title="Signals"
      subtitle="Every alert below cleared the same stack: z-threshold, cost hurdle, persistence, liquidity. The rest of the board is silent on purpose — and the backtest lab is where you try to prove it."
      actions={
        <Badge tone={armedCount > 0 ? "up" : "outline"}>
          {armedCount} ARMED / {(alerts.data ?? []).length} OPEN
        </Badge>
      }
    >
      <Panel
        eyebrow="Alert feed"
        title="Gated dislocations"
        description="Ranked by severity. Acknowledging keeps an alert visible; dismissing hides it for the session."
        actions={
          <span className="flex items-center gap-1.5">
            <Filter className="size-3.5 text-dim" aria-hidden="true" />
            <Segmented
              ariaLabel="Filter alerts by severity"
              value={feed.filter}
              onChange={feed.setFilter}
              options={feed.FILTERS}
            />
          </span>
        }
      >
        <AsyncBoundary
          loading={alerts.loading}
          error={alerts.error}
          data={alerts.data}
          onRetry={alerts.reload}
          empty={{
            title: "No alerts in this window",
            hint: "Gates are re-evaluated on every settlement. Silence means nothing cleared the cost hurdle.",
          }}
        >
          {() =>
            feed.visible.length === 0 ? (
              <div className="flex flex-col items-center gap-2 rounded-xs border border-dashed border-line px-4 py-8 text-center">
                <Bell className="size-4 text-dim" aria-hidden="true" />
                <p className="text-sm text-ash">Nothing matches this filter</p>
                <p className="max-w-md text-xs leading-relaxed text-dim">
                  {feed.filter === "all"
                    ? "Everything on the board was dismissed."
                    : `No ${feed.filter} alerts right now — switch back to All.`}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {feed.visible.map((alert) => (
                  <AlertCard
                    key={alert.id}
                    alert={alert}
                    state={feed.states[alert.id] ?? "open"}
                    onAct={(item, action) => act(item, action)}
                  />
                ))}
              </div>
            )
          }
        </AsyncBoundary>
      </Panel>

      <BacktestPanel />
    </PageShell>
  );
}
