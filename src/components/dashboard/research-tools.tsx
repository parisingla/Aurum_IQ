"use client";

import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { ArrowRight } from "lucide-react";
import {
  ArrowLeftRight,
  BookOpen,
  CalendarDays,
  FlaskConical,
  Layers3,
  Sparkles,
} from "lucide-react";
import { MarbleArtwork, type MarbleCrop, type MarbleTexture } from "@/components/ui/marble";

interface Tool {
  href: string;
  label: string;
  /** Family texture + deliberate crop. Silhouette, size and placement are shared. */
  texture: MarbleTexture;
  crop: MarbleCrop;
  flip?: boolean;
  icon: LucideIcon;
}

/**
 * Six tool tiles sharing one artwork system: identical silhouette (the shared
 * "edge" mask), identical width (--marble-card-width), identical placement on
 * the right. Only the texture palette and crop vary, so the family reads as
 * one art-directed set rather than six unrelated fragments.
 */
const TOOLS: readonly Tool[] = [
  { href: "/contracts", label: "Contract Explorer", texture: "ocean", crop: "left top", icon: Layers3 },
  { href: "/spreads", label: "Spread Lab", texture: "teal", crop: "center top", flip: true, icon: ArrowLeftRight },
  { href: "/term-structure", label: "Term Structure", texture: "navy", crop: "right top", icon: CalendarDays },
  { href: "/backtesting", label: "Backtesting", texture: "ocean", crop: "right center", flip: true, icon: FlaskConical },
  { href: "/assistant", label: "AI Assistant", texture: "teal", crop: "left center", icon: Sparkles },
  { href: "/research", label: "Methodology & Data", texture: "navy", crop: "center bottom", flip: true, icon: BookOpen },
];

export function ResearchTools() {
  return (
    <section
      className="grid gap-5 lg:grid-cols-[13rem_1fr]"
      aria-label="Research tools"
    >
      <div>
        <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.28em] text-ocean-navy">
          Explore
        </p>
        <span className="mt-2 block h-px w-16 bg-ocean-teal" aria-hidden="true" />
        <h2 className="mt-2 font-display text-[2rem] font-semibold leading-[1.1] tracking-tight text-ocean-navy">
          Research
          <br />
          Tools
        </h2>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
        {TOOLS.map((tool) => {
          const Icon = tool.icon;
          return (
            <Link
              key={tool.href}
              href={tool.href}
              className="group relative block overflow-hidden rounded-lg border border-line bg-white-surface transition-shadow hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              <MarbleArtwork
                mask="edge"
                texture={tool.texture}
                crop={tool.crop}
                flip={tool.flip}
                opacity={0.9}
                className="absolute inset-y-0 right-0 w-[var(--marble-card-width)] transition-transform duration-200 group-hover:scale-[1.02]"
              />
              <span className="relative flex h-full min-h-28 flex-col p-4">
                <span className="flex size-8 items-center justify-center rounded-full bg-white-surface/90 shadow-sm ring-1 ring-line">
                  <Icon className="size-4 text-ocean-navy" aria-hidden="true" />
                </span>
                <span className="mt-2 block max-w-[70%] text-[0.8125rem] font-semibold leading-snug text-ocean-navy">
                  {tool.label}
                </span>
                <span className="mt-auto flex justify-end pt-3">
                  <span className="flex size-6 items-center justify-center rounded-full bg-white-surface/90 shadow-sm ring-1 ring-line">
                    <ArrowRight
                      className="size-3.5 text-ocean-navy transition-transform duration-200 group-hover:translate-x-0.5"
                      aria-hidden="true"
                    />
                  </span>
                </span>
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

export { TOOLS as RESEARCH_TOOLS };
