import { SignalsWorkspace } from "@/components/signals/signals-workspace";

export const metadata = {
  title: "Signals",
  description: "Cost-gated relative-value alerts and a walk-forward backtest lab.",
};

export default function SignalsPage() {
  return <SignalsWorkspace />;
}
