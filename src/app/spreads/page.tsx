import { Suspense } from "react";
import { SpreadLab } from "@/components/spreads/spread-lab";
import { Panel } from "@/components/ui/panel";
import { PanelSkeleton } from "@/components/ui/states";

export const metadata = {
  title: "Spreads",
  description: "Purity- and carry-adjusted relative value for MCX gold futures pairs — demo data.",
};

export default function SpreadsPage() {
  return (
    <Suspense
      fallback={
        <div className="px-4 py-6 sm:px-6">
          <Panel>
            <PanelSkeleton rows={6} />
          </Panel>
        </div>
      }
    >
      <SpreadLab />
    </Suspense>
  );
}
