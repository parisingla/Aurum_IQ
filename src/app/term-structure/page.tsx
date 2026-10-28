import { Suspense } from "react";
import { TermStructureDashboard } from "@/components/term-structure/term-structure-dashboard";
import { Panel } from "@/components/ui/panel";
import { PanelSkeleton } from "@/components/ui/states";

export const metadata = {
  title: "Term Structure",
  description: "Forward curves and carry analysis for MCX gold futures — demo data.",
};

export default function TermStructurePage() {
  return (
    <Suspense
      fallback={
        <div className="px-4 py-6 sm:px-6">
          <Panel>
            <PanelSkeleton rows={8} />
          </Panel>
        </div>
      }
    >
      <TermStructureDashboard />
    </Suspense>
  );
}
