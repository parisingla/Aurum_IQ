"use client";

import Link from "next/link";
import { RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SparklesCore } from "@/components/ui/sparkles";
import { formatDate } from "@/lib/format";
import type { DataStatus } from "@/lib/types";
import { NAV_ITEMS } from "./nav-items";

const SPARKLE_COLORS = ["#f0c766", "#d6a640", "#a5a199", "#eae7e0"];

/**
 * Site footer: the AurumIQ wordmark over a sparkle beam, navigation, and the
 * engine's own dataset metadata. The badge and session rows tell the truth
 * about what the last uploaded CSV contains — with no upload they say so.
 */
export function SiteFooter({
  onRefresh,
  status,
}: {
  onRefresh: () => void;
  status?: DataStatus | null;
}) {
  const live = status?.source === "api";

  return (
    <footer className="relative overflow-hidden border-t border-line bg-ink-900">
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold/60 to-transparent" />

      {/* Wordmark + sparkle beam, echoing the classic sparkles hero. */}
      <div className="relative flex flex-col items-center px-4 pt-10 sm:px-6">
        <p className="relative z-20 text-center font-display text-4xl leading-none tracking-tight text-bone sm:text-5xl md:text-6xl lg:text-7xl">
          Aurum<span className="text-gold">IQ</span>
        </p>
        <p className="label-mono relative z-20 mt-3.5 text-center">
          Relative-value research · MCX gold complex
        </p>

        <div className="relative mt-5 h-32 w-full max-w-2xl overflow-hidden">
          {/* Gradient beams above the dust. */}
          <div aria-hidden="true" className="absolute inset-x-16 top-0 h-px bg-gradient-to-r from-transparent via-gold/70 to-transparent" />
          <div aria-hidden="true" className="absolute inset-x-24 top-0 h-[3px] w-3/4 bg-gradient-to-r from-transparent via-gold/35 to-transparent blur-[2px]" />
          <div aria-hidden="true" className="absolute inset-x-1/3 top-0 h-1 w-1/4 bg-gradient-to-r from-transparent via-gold-bright/45 to-transparent blur-sm" />

          <SparklesCore
            background="transparent"
            minSize={0.4}
            maxSize={1.7}
            particleDensity={2600}
            particleColor={SPARKLE_COLORS}
            className="absolute inset-0 h-full w-full"
          />

          {/* Keep the dust under the beam; hide it toward the edges and bottom. */}
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-ink-900 [mask-image:radial-gradient(22rem_8rem_at_top,transparent_20%,black)]"
          />
        </div>
      </div>

      <div className="relative mx-auto max-w-[110rem] px-4 pb-5 pt-4 sm:px-6">
        <div className="grid gap-8 lg:grid-cols-[1.5fr_1fr_1.15fr]">
          <div className="min-w-0">
            <p className="label-mono">About this build</p>
            <p className="mt-3 max-w-md text-[0.8125rem] leading-relaxed text-ash">
              Relative-value research for the MCX gold complex. Purity, carry and residual are
              priced apart — then a full round-trip cost is charged before anything is called an
              edge.
            </p>
            <div className="mt-3.5 flex flex-wrap items-center gap-2">
              {status == null ? (
                <Badge tone="warning">ENGINE OFFLINE</Badge>
              ) : live ? (
                <Badge tone="info">LIVE ENGINE</Badge>
              ) : (
                <Badge tone="warning">NO DATASET — UPLOAD CSV</Badge>
              )}
              <Badge tone="outline">{live ? `SETTLEMENTS ${formatDate(status?.asOf ?? "")}` : "NO DATASET"}</Badge>
              <Badge tone="outline">UPLOAD-DRIVEN</Badge>
            </div>
          </div>

          <nav aria-label="Footer">
            <p className="label-mono">Navigate</p>
            <ul className="mt-3 space-y-2">
              {NAV_ITEMS.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="group inline-flex items-center gap-2 text-[0.8125rem] text-ash transition-colors duration-150 hover:text-gold-bright focus-visible:text-gold-bright"
                  >
                    <item.icon
                      aria-hidden="true"
                      className="size-3.5 text-dim transition-colors duration-150 group-hover:text-gold"
                    />
                    <span>{item.label}</span>
                    <span className="label-mono text-dim opacity-0 transition-opacity duration-150 group-hover:opacity-100">
                      {item.hint}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div className="min-w-0">
            <p className="label-mono">Session &amp; method</p>
            <dl className="mt-3 space-y-2 text-[0.75rem] leading-relaxed">
              <div className="flex gap-2">
                <dt className="w-28 shrink-0 text-dim">Data as of</dt>
                <dd className="font-mono tabular-nums text-ash">
                  {live && status ? `${formatDate(status.asOf)} · 15:30 IST` : "— no dataset"}
                </dd>
              </div>
              <div className="flex gap-2">
                <dt className="w-28 shrink-0 text-dim">Next session</dt>
                <dd className="font-mono tabular-nums text-ash">
                  {live && status ? `${formatDate(status.nextExpected)} · 09:00 IST` : "— after first upload"}
                </dd>
              </div>
              <div className="flex gap-2">
                <dt className="w-28 shrink-0 text-dim">Data source</dt>
                <dd className="font-mono text-ash">
                  {status == null
                    ? "Engine not connected"
                    : live
                      ? `Uploaded CSV · ${status.rows.toLocaleString()} rows`
                      : "Empty — nothing synthesised"}
                </dd>
              </div>
            </dl>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <Link
                href="/research"
                className="inline-flex h-7 items-center gap-1.5 rounded-xs border border-line-strong px-2.5 text-xs text-ash transition-colors duration-150 hover:border-dim hover:text-bone focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              >
                Method, limits &amp; sources
              </Link>
              <Button
                variant="ghost"
                size="sm"
                icon={<RefreshCw className="size-3.5" aria-hidden="true" />}
                onClick={onRefresh}
                title="Reload every panel (Cmd/Ctrl + Shift + R)"
              >
                Refresh panels
              </Button>
            </div>
            <p className="mt-2.5 text-[0.6875rem] leading-snug text-dim">
              Keyboard: Cmd/Ctrl + Shift + R reloads every panel without a full page load.
            </p>
          </div>
        </div>

        <div className="mt-8 flex flex-col gap-2 border-t border-line/70 pt-4 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
          <p className="max-w-3xl text-[0.6875rem] leading-relaxed text-dim">
            Commodity Derivatives Intelligence track. A research terminal, not investment advice —
            no order entry, no execution. Every number shown comes from the last uploaded bhavcopy
            CSV; with no upload the terminal is empty and stays that way — nothing is synthesised
            or preloaded.
          </p>
          <p className="label-mono shrink-0 text-dim">aurum iq · build 2026.10</p>
        </div>
      </div>
    </footer>
  );
}
