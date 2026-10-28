import { Suspense } from "react";
import { AIAssistant } from "@/components/assistant/ai-assistant";
import { Panel } from "@/components/ui/panel";
import { PanelSkeleton } from "@/components/ui/states";

export const metadata = {
  title: "AI Assistant",
  description: "Research assistant for MCX gold futures analysis — demo mode.",
};

export default function AssistantPage() {
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
      <AIAssistant />
    </Suspense>
  );
}
