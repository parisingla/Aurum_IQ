import { Suspense } from "react";
import { ContractExplorer } from "@/components/contracts/contract-explorer";
import { Panel } from "@/components/ui/panel";
import { PanelSkeleton } from "@/components/ui/states";

export const metadata = {
  title: "Contracts",
  description: "Live MCX gold contract rows across five products — demo fixtures.",
};

export default function ContractsPage() {
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
      <ContractExplorer />
    </Suspense>
  );
}
