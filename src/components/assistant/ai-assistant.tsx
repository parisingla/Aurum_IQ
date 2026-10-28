"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { FileSearch, Send, Sparkles } from "lucide-react";
import { PageShell, useRefreshNonce } from "@/components/layout/shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Panel } from "@/components/ui/panel";
import { askAssistant, fetchDataStatus } from "@/lib/api";
import { useAsync } from "@/lib/hooks";

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  mode?: "template" | "llm" | "error";
}

/** The grounded answers carry markdown bold + ASCII tables — render plainly. */
function plainAnswer(text: string): string {
  return text.replace(/\*\*/g, "");
}

/** The one-click analysis: what does the loaded dataset actually say? */
const RESULT_QUESTION =
  "Analyze the currently loaded dataset end to end: what does the data say about the term structure, the monitored spreads, whether any edge survives the cost hurdle, and what the data-quality checks warn about.";

export function AIAssistant() {
  const searchParams = useSearchParams();
  const carriedQuestion = searchParams.get("q") ?? "";
  const refreshNonce = useRefreshNonce();
  const [query, setQuery] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [resultBusy, setResultBusy] = useState(false);
  const autoRan = useRef(false);

  // Live dataset loaded? (source flips to "api" after a successful upload)
  const status = useAsync(() => fetchDataStatus(), [refreshNonce]);
  const datasetLoaded = status.data?.source === "api";

  const runQuery = async (content: string, options: { useLlm?: boolean; busySetter?: (busy: boolean) => void } = {}) => {
    const busy = options.busySetter ?? setLoading;
    setMessages((prev) => [...prev, { role: "user", content, timestamp: new Date() }]);
    busy(true);

    try {
      const response = await askAssistant(content, { useLlm: options.useLlm });
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: plainAnswer(response.answer),
          timestamp: new Date(),
          mode: response.mode,
        },
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: err instanceof Error ? err.message : "The assistant could not answer.",
          timestamp: new Date(),
          mode: "error",
        },
      ]);
    } finally {
      busy(false);
    }
  };

  // A question carried from the Overview "Ask AURUM IQ" panel runs once on arrival.
  useEffect(() => {
    if (autoRan.current || !carriedQuestion.trim()) return;
    autoRan.current = true;
    void runQuery(carriedQuestion.trim());
  }, [carriedQuestion]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() || loading) return;
    const content = query.trim();
    setQuery("");
    await runQuery(content);
  };

  const runResult = async () => {
    if (resultBusy) return;
    await runQuery(RESULT_QUESTION, { useLlm: true, busySetter: setResultBusy });
  };

  return (
    <PageShell
      title="AI Research Assistant"
      subtitle={
        datasetLoaded
          ? "Grounded in your loaded dataset — every number comes from the engine, the narrative from the LLM."
          : "Ask questions about MCX gold spreads, carry, signals, and methodology."
      }
      actions={
        datasetLoaded ? (
          <Badge tone="info">LIVE · AI ANALYSIS READY</Badge>
        ) : (
          <Badge tone="warning">DEMO MODE</Badge>
        )
      }
    >
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Chat panel */}
        <div className="lg:col-span-2">
          <Panel
            eyebrow="Research assistant"
            title="Ask about relative value"
            description="Grounded in the running engine — no price forecasts or investment advice."
          >
            <div className="space-y-4">
              {/* Messages */}
              <div className="min-h-[400px] max-h-[600px] overflow-y-auto scroll-thin space-y-3">
                {messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-[400px] text-center">
                    <Sparkles className="size-12 text-gold mb-4" aria-hidden="true" />
                    <p className="text-sm text-ash">
                      Ask about spreads, carry, signals, costs, or methodology
                    </p>
                    <p className="text-xs text-dim mt-2">
                      {datasetLoaded
                        ? "Your dataset is live — press “Analyze my dataset” for the full read."
                        : "Example: “What's the current GOLDPETAL vs GOLDM spread?”"}
                    </p>
                  </div>
                ) : (
                  messages.map((msg, index) => (
                    <div
                      key={index}
                      className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[85%] rounded-md px-3 py-2 ${
                          msg.role === "user"
                            ? "bg-gold/20 text-bone"
                            : "bg-ink-800 text-ash border border-line"
                        }`}
                      >
                        {msg.role === "assistant" && msg.mode === "llm" && (
                          <p className="mb-1.5 font-mono text-[0.625rem] uppercase tracking-[0.12em] text-gold">
                            AI analysis · grounded in engine facts
                          </p>
                        )}
                        <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
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

        {/* Quick actions */}
        <div className="space-y-4">
          <Panel
            eyebrow="Dataset analysis"
            title={datasetLoaded ? "Result" : "Load a CSV first"}
            description={
              datasetLoaded
                ? "One click — the LLM narrates what your loaded data shows."
                : "Upload a bhavcopy CSV (top bar), then this button runs the analysis."
            }
          >
            <Button
              size="md"
              variant={datasetLoaded ? "primary" : "outline"}
              disabled={!datasetLoaded || resultBusy}
              onClick={runResult}
              icon={<FileSearch className="size-4" aria-hidden="true" />}
              className="w-full"
            >
              {resultBusy ? "Analyzing…" : "Analyze my dataset"}
            </Button>
            {!datasetLoaded && (
              <p className="mt-2 text-[0.6875rem] text-dim leading-snug">
                {status.data?.source === "empty"
                  ? "Upload a bhavcopy CSV first — there is nothing to analyze until then."
                  : status.error != null
                    ? "Engine not connected — check NEXT_PUBLIC_API_BASE_URL."
                    : "Checking the engine…"}
              </p>
            )}
          </Panel>

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
                <span>Only answers from the running engine — no external data</span>
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
                <span>
                  {status.data?.source === "empty"
                    ? "No dataset yet — upload a CSV and the assistant answers from it"
                    : "AI narrative (OpenRouter) when enabled; template fallback otherwise"}
                </span>
              </li>
            </ul>
          </Panel>
        </div>
      </div>
    </PageShell>
  );
}
