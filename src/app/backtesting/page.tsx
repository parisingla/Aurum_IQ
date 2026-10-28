import { Suspense } from "react";
import { BacktestingStudio } from "@/components/backtesting/backtesting-studio";
import { Panel } from "@/components/ui/panel";
import { PanelSkeleton } from "@/components/ui/states";

export const metadata = {
  title: "Backtesting Studio",
  description: "Walk-forward backtest lab with cost analysis for MCX gold spreads.",
};

export default function BacktestingPage() {
  return (
    <Suspense
      fallback={
        <div className="px-4 py-6 sm:px-6">
          <Panel>
            <PanelSkeleton rows={10} />
          </Panel>
        </div>
      }
    >
      <BacktestingStudio />
    </Suspense>
  );
}
