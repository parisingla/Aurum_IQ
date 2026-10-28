"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Send, Sparkles } from "lucide-react";
import { PageShell } from "@/components/layout/shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Panel } from "@/components/ui/panel";

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

export function AIAssistant() {
  const searchParams = useSearchParams();
  const carriedQuestion = searchParams.get("q") ?? "";
  const [query, setQuery] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const autoRan = useRef(false);

  const generateDemoResponse = (question: string): string => {
    const q = question.toLowerCase();

    if (q.includes("spread") || q.includes("relative value")) {
      return "Based on the current fixtures, the GOLDPETAL vs GOLDM spread shows a residual basis of +12.5 bps after adjusting for purity and carry. The z-score is 2.4, which is above the entry threshold of 2.0. However, after accounting for round-trip costs of 6.2 bps, the expected edge is 3.8 bps — within the cost hurdle but not strongly gated.";
    }

    if (q.includes("carry") || q.includes("term structure")) {
      return "The term structure analysis indicates the curve is in mild contango, with an implied carry of approximately 6.50% annualized for the front-to-second month roll. This is close to the reference MIBOR rate of 6.60%, suggesting the curve is fairly priced for carry.";
    }

    if (q.includes("signal") || q.includes("alert")) {
      return "Currently, there are 2 armed signals out of 7 open alerts. The others were blocked by the cost gate — the expected capture after costs did not exceed the round-trip threshold. The largest residual is in GOLDGUINEA vs GOLDM at 18.3 bps, but this is a thin contract with high slippage.";
    }

    if (q.includes("cost") || q.includes("brokerage")) {
      return "Round-trip costs include: brokerage (capped at ₹20 per order), CTT (0.01%), stamp duty (0.002%), MCX transaction charge, SEBI fee, GST (18% on brokerage + transaction charges), and modeled bid-ask slippage. For GOLDM vs GOLDPETAL, total cost is approximately 6.2 bps per round trip.";
    }

    if (q.includes("how is this spread calculated") || q.includes("normalis") || q.includes("normaliz")) {
      return "Every contract is restated to ₹ per gram of fine gold: settlement ÷ quoted grams ÷ fineness. Purity (999 vs 995) and carry across the expiry gap are removed as explicit terms, and whatever remains is the residual you see in the Spread Lab.";
    }

    if (q.includes("why was this observation flagged") || q.includes("flagged")) {
      return "An observation is flagged when its lagged z-score crosses the ±2σ entry gate AND the expected capture after costs still clears the round-trip toll — and it persists for two sessions. Unusual on its own is never enough.";
    }

    if (q.includes("transaction cost") || q.includes("costs affect")) {
      return "The cost gate is the honesty layer: expected edge = 0.8 × |residual| − round trip. If that number is not positive, the observation stays an observation — no alert fires. Many statistically unusual spreads die exactly here.";
    }

    return "I'm operating in demo mode with fixture data from October 19, 2026. I can explain spreads, carry, signals, costs, and methodology. Please note that all figures are synthetic — this is a research prototype, not investment advice. What specific aspect would you like to explore?";
  };

  const runQuery = (content: string) => {
    const userMessage: Message = {
      role: "user",
      content,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setLoading(true);

    // Simulated response for demo mode
    setTimeout(() => {
      const assistantMessage: Message = {
        role: "assistant",
        content: generateDemoResponse(content),
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, assistantMessage]);
      setLoading(false);
    }, 1000);
  };

  // A question carried from the Overview "Ask AURUM IQ" panel runs once on arrival.
  useEffect(() => {
    if (autoRan.current || !carriedQuestion.trim()) return;
    autoRan.current = true;
    runQuery(carriedQuestion.trim());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [carriedQuestion]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() || loading) return;

    const content = query.trim();
    setQuery("");
    runQuery(content);
  };

  return (
    <PageShell
      title="AI Research Assistant"
      subtitle="Ask questions about MCX gold spreads, carry, signals, and methodology. Demo mode with fixture data."
      actions={<Badge tone="warning">DEMO MODE</Badge>}
    >
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Chat panel */}
        <div className="lg:col-span-2">
          <Panel
            eyebrow="Research assistant"
            title="Ask about relative value"
            description="Grounded in the current fixture set — no price forecasts or investment advice."
          >
            <div className="space-y-4">
              {/* Messages */}
              <div className="min-h-[400px] max-h-[600px] overflow-y-auto scroll-thin space-y-3">
                {messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-[400px] text-center">
                    <Sparkles className="size-12 text-gold mb-4" />
                    <p className="text-sm text-ash">
                      Ask about spreads, carry, signals, costs, or methodology
                    </p>
                    <p className="text-xs text-dim mt-2">
                      Example: &quot;What&apos;s the current GOLDPETAL vs GOLDM spread?&quot;
                    </p>
                  </div>
                ) : (
                  messages.map((msg, index) => (
                    <div
                      key={index}
                      className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[80%] rounded-md px-3 py-2 ${
                          msg.role === "user"
                            ? "bg-gold/20 text-bone"
                            : "bg-ink-800 text-ash border border-line"
                        }`}
                      >
                        <p className="text-sm leading-relaxed">{msg.content}</p>
                        <p className="text-[0.625rem] text-dim mt-1">
                          {msg.timestamp.toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                  ))
                )}
                {loading && (
                  <div className="flex justify-start">
                    <div className="bg-ink-800 border border-line rounded-md px-3 py-2">
                      <div className="flex items-center gap-2">
                        <div className="animate-pulse size-2 bg-gold rounded-full" />
                        <p className="text-xs text-dim">Thinking…</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Input */}
              <form onSubmit={handleSubmit} className="flex gap-2">
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Ask about spreads, carry, signals, costs…"
                  className="flex-1 rounded-xs border border-line bg-ink-800 px-3 py-2 text-sm text-bone placeholder-dim focus:border-gold focus:outline-none"
                  disabled={loading}
                />
                <Button
                  type="submit"
                  size="sm"
                  disabled={!query.trim() || loading}
                  icon={<Send className="size-3.5" />}
                >
                  Send
                </Button>
              </form>
            </div>
          </Panel>
        </div>

        {/* Quick questions */}
        <div className="space-y-4">
          <Panel eyebrow="Quick questions" title="Common queries">
            <div className="space-y-2">
              {[
                "What's the current spread between GOLDPETAL and GOLDM?",
                "Explain the term structure and carry",
                "Which signals are currently armed?",
                "How are round-trip costs calculated?",
                "What does the z-score mean?",
              ].map((q, index) => (
                <button
                  key={index}
                  onClick={() => setQuery(q)}
                  className="w-full text-left rounded-xs border border-line bg-ink-800 px-3 py-2 text-xs text-ash hover:border-gold/50 hover:text-bone transition-colors"
                >
                  {q}
                </button>
              ))}
            </div>
          </Panel>

          <Panel eyebrow="Constraints" title="Ground rules">
            <ul className="space-y-2 text-xs text-ash">
              <li className="flex items-start gap-2">
                <span className="text-gold mt-0.5">•</span>
                <span>Only answers from the fixture set — no external data</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-gold mt-0.5">•</span>
                <span>No price forecasts or investment advice</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-gold mt-0.5">•</span>
                <span>Every number must exist in the computed facts</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-gold mt-0.5">•</span>
                <span>Demo mode: responses are templates, not LLM-generated</span>
              </li>
            </ul>
          </Panel>
        </div>
      </div>
    </PageShell>
  );
}
