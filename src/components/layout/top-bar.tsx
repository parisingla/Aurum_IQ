"use client";

import { useState } from "react";
import { Menu, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useClock } from "@/lib/hooks";
import { formatRelative, formatTimestamp } from "@/lib/format";
import { cn } from "@/lib/cn";

const AS_OF_STAMP = "2026-10-19 15:30";
const AS_OF_ISO = "2026-10-19T15:30:00.000Z";

interface TopBarProps {
  title: string;
  subtitle?: string;
  onMenu: () => void;
  onRefresh: () => void;
}

export function TopBar({ title, subtitle, onMenu, onRefresh }: TopBarProps) {
  const nowMs = useClock(60_000);
  const [spin, setSpin] = useState(false);

  function handleRefresh() {
    setSpin(true);
    onRefresh();
    setTimeout(() => setSpin(false), 700);
  }

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-ink-900/85 backdrop-blur-sm">
      <div className="flex h-14 items-center gap-3 px-4 sm:px-6">
        <button
          type="button"
          onClick={onMenu}
          className="-ml-1 rounded-xs p-1.5 text-ash transition-colors hover:bg-ink-800 hover:text-bone lg:hidden"
          aria-label="Open navigation"
        >
          <Menu className="size-4" aria-hidden="true" />
        </button>

        <div className="min-w-0">
          <h1 className="truncate text-sm font-medium tracking-tight text-bone">{title}</h1>
          {subtitle && <p className="label-mono mt-0.5 truncate">{subtitle}</p>}
        </div>

        <div className="ml-auto flex items-center gap-2 sm:gap-3">
          <Badge
            tone="gold"
            title="Every figure on this site is fixture data, not a live MCX feed."
          >
            DEMO DATA
          </Badge>
          <div className="hidden items-center gap-3 md:flex">
            <span className="label-mono text-dim">as of {formatTimestamp(AS_OF_STAMP)}</span>
            <span className="h-4 w-px bg-line" aria-hidden="true" />
            <span className="label-mono text-dim">
              {nowMs === null ? "clock…" : `clock ${formatRelative(AS_OF_ISO, nowMs)}`}
            </span>
          </div>
          <Button
            size="sm"
            variant="ghost"
            onClick={handleRefresh}
            title="Reload every panel (⌘⇧R)"
            aria-label="Reload every panel"
            icon={<RefreshCw className={cn("size-3.5", spin && "animate-spin")} aria-hidden="true" />}
          />
        </div>
      </div>
    </header>
  );
}
