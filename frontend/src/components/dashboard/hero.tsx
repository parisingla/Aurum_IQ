"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { MarbleArtwork } from "@/components/ui/marble";

const STEPS = [
  {
    title: "Import Data",
    body: "Bring an MCX bhavcopy CSV into the engine. Every row is validated before anything is computed.",
  },
  {
    title: "Verify Contracts",
    body: "Check unit, quotation basis, purity and expiry for each of the five gold products.",
  },
  {
    title: "Compare Spreads",
    body: "Put any two contracts on one fine-gold basis, strip purity and carry, and read the residual.",
  },
  {
    title: "Test a Hypothesis",
    body: "Walk a rule forward through history, out of sample, and charge it full round-trip costs.",
  },
  {
    title: "Review Evidence",
    body: "Read what the numbers support — and what they refuse to claim. Silence is an answer too.",
  },
];

/**
 * Three stacked metallic gold ingots in one consistent upper-left-lit
 * perspective. Every face uses multi-stop gradients (champagne highlights,
 * warm gold faces, amber-bronze sides), bevels carry narrow specular strips,
 * and the marble palette is echoed by faint teal/navy reflections low on the
 * faces. Ground shadows are layered: a wide ambient pool plus tight contact
 * shadows, biased toward the lower-right.
 */
function GoldBars({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 260 170" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="au-top" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#F7E7AC" />
          <stop offset="0.35" stopColor="#EACB74" />
          <stop offset="0.7" stopColor="#D3A83E" />
          <stop offset="1" stopColor="#B8891F" />
        </linearGradient>
        <linearGradient id="au-front" x1="0" y1="0" x2="0.25" y2="1">
          <stop offset="0" stopColor="#EFC75C" />
          <stop offset="0.3" stopColor="#DAA938" />
          <stop offset="0.68" stopColor="#B5810E" />
          <stop offset="1" stopColor="#7E5B08" />
        </linearGradient>
        <linearGradient id="au-side" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#A26F0E" />
          <stop offset="0.5" stopColor="#6F5009" />
          <stop offset="1" stopColor="#452F05" />
        </linearGradient>
        <linearGradient id="au-env" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#2FB0C4" stopOpacity="0" />
          <stop offset="1" stopColor="#2FB0C4" stopOpacity="0.55" />
        </linearGradient>
        <filter id="au-b2" x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="2.2" />
        </filter>
        <filter id="au-b4" x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="4" />
        </filter>
        <filter id="au-b7" x="-80%" y="-80%" width="260%" height="260%">
          <feGaussianBlur stdDeviation="6.5" />
        </filter>
      </defs>

      {/* ground shadows: ambient pool + tight contacts, biased lower-right */}
      <ellipse cx="126" cy="137" rx="112" ry="9" fill="#4A3505" opacity="0.16" filter="url(#au-b7)" />
      <ellipse cx="80" cy="130" rx="52" ry="6" fill="#3A2A05" opacity="0.3" filter="url(#au-b4)" />
      <ellipse cx="184" cy="130" rx="54" ry="6" fill="#3A2A05" opacity="0.3" filter="url(#au-b4)" />

      {/* bar A — lower left */}
      <g>
        <polygon points="18,88 112,88 112,128 18,128" fill="url(#au-front)" />
        <polygon points="112,88 132,66 132,106 112,128" fill="url(#au-side)" />
        <polygon points="18,88 54,66 132,66 112,88" fill="url(#au-top)" />
        <polygon points="18,88 54,66 57.5,68.5 22,90" fill="#FBE9A8" opacity="0.8" />
        <polygon points="54,66 132,66 132,67.8 54,67.8" fill="#F6E3A1" opacity="0.55" />
        <polygon points="18,86.2 112,86.2 112,89.8 18,89.8" fill="#FCEFAF" opacity="0.9" />
        <polygon points="18,124 112,124 112,128 18,128" fill="#6E5007" opacity="0.5" />
        <polygon points="110,88 112,88 112,128 110,128" fill="#4A3406" opacity="0.55" />
        <polygon points="112,108 132,86 132,90 112,112" fill="#0B2545" opacity="0.22" />
        <rect x="20" y="106" width="90" height="20" fill="url(#au-env)" opacity="0.12" />
        <polygon points="60,84 84,68 92,68 68,84" fill="#FFF6D8" opacity="0.18" />
        <line x1="26" y1="100" x2="104" y2="100" stroke="#FFF3C4" strokeWidth="1" opacity="0.08" />
        <line x1="32" y1="113" x2="98" y2="113" stroke="#6E5007" strokeWidth="1" opacity="0.1" />
      </g>

      {/* bar B casting onto bar A's side */}
      <polygon points="132,88 124,88 124,128 132,128" fill="#2A1D04" opacity="0.32" filter="url(#au-b2)" />

      {/* bar B — lower right */}
      <g>
        <polygon points="124,88 218,88 218,128 124,128" fill="url(#au-front)" />
        <polygon points="218,88 238,66 238,106 218,128" fill="url(#au-side)" />
        <polygon points="124,88 160,66 238,66 218,88" fill="url(#au-top)" />
        <polygon points="124,88 160,66 163.5,68.5 128,90" fill="#FBE9A8" opacity="0.8" />
        <polygon points="160,66 238,66 238,67.8 160,67.8" fill="#F6E3A1" opacity="0.55" />
        <polygon points="124,86.2 218,86.2 218,89.8 124,89.8" fill="#FCEFAF" opacity="0.9" />
        <polygon points="124,124 218,124 218,128 124,128" fill="#6E5007" opacity="0.5" />
        <polygon points="216,88 218,88 218,128 216,128" fill="#4A3406" opacity="0.55" />
        <polygon points="218,108 238,86 238,90 218,112" fill="#0B2545" opacity="0.22" />
        <rect x="126" y="106" width="90" height="20" fill="url(#au-env)" opacity="0.12" />
        <polygon points="166,84 190,68 198,68 174,84" fill="#FFF6D8" opacity="0.18" />
        <line x1="132" y1="100" x2="210" y2="100" stroke="#FFF3C4" strokeWidth="1" opacity="0.08" />
        <line x1="138" y1="113" x2="204" y2="113" stroke="#6E5007" strokeWidth="1" opacity="0.1" />
      </g>

      {/* top bar's contact shadow, welded onto the lower bars' top faces */}
      <rect x="76" y="77" width="74" height="9" fill="#3A2A05" opacity="0.3" filter="url(#au-b2)" />

      {/* bar C — smaller, on top, front face seated on the lower bars' surfaces */}
      <g>
        <polygon points="76,46 148,46 148,80 76,80" fill="url(#au-front)" />
        <polygon points="148,46 164,26 164,66 148,80" fill="url(#au-side)" />
        <polygon points="76,46 102,26 164,26 148,46" fill="url(#au-top)" />
        <polygon points="76,46 102,26 105.5,28.5 79.5,48" fill="#FBE9A8" opacity="0.8" />
        <polygon points="102,26 164,26 164,27.8 102,27.8" fill="#F6E3A1" opacity="0.55" />
        <polygon points="76,44.2 148,44.2 148,47.8 76,47.8" fill="#FCEFAF" opacity="0.9" />
        <polygon points="76,77 148,77 148,80 76,80" fill="#6E5007" opacity="0.5" />
        <polygon points="146,46 148,46 148,80 146,80" fill="#4A3406" opacity="0.55" />
        <polygon points="148,58 164,34 164,38 148,62" fill="#0B2545" opacity="0.22" />
        <rect x="78" y="66" width="68" height="12" fill="url(#au-env)" opacity="0.1" />
        <polygon points="100,44 118,28 124,28 106,44" fill="#FFF6D8" opacity="0.15" />
        <line x1="82" y1="58" x2="142" y2="58" stroke="#FFF3C4" strokeWidth="1" opacity="0.07" />
        <text x="101" y="70" fontSize="7.5" fontWeight="700" fill="#8F6A0B" opacity="0.55" fontFamily="monospace">999.9</text>
      </g>

      {/* restrained bevel glints — no blown-out whites */}
      <polygon points="56,69 66,66.5 64.5,71.5 58.5,72.5" fill="#FFF6D8" opacity="0.85" />
      <polygon points="162,69 172,66.5 170.5,71.5 164.5,72.5" fill="#FFF6D8" opacity="0.7" />
      <polygon points="104,29 112,27 110.5,31 105.5,31.5" fill="#FFF6D8" opacity="0.8" />
    </svg>
  );
}

/**
 * Graph-paper chart sheet — warm ivory, fine low-contrast grid, one smooth
 * rising teal line with navy markers. Illustrative artwork only: no prices,
 * labels or performance claims. The line sits high on the sheet so it is
 * never crossed or hidden by the gold bars.
 */
function GraphPaper({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 200 130" className={className}>
      <g stroke="#F0E7D5" strokeWidth="1">
        {[0, 1, 2, 3, 4, 5, 6].map((i) => (
          <line key={`h${i}`} x1="6" x2="194" y1={14 + i * 18} y2={14 + i * 18} />
        ))}
        {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
          <line key={`v${i}`} y1="8" y2="122" x1={8 + i * 23} x2={8 + i * 23} />
        ))}
      </g>
      <path
        d="M 84 84 C 96 76 106 70 120 62 C 134 54 146 48 156 40 C 168 31 178 25 188 18"
        fill="none"
        stroke="#087CA5"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
      {[
        [120, 62], [156, 40],
      ].map(([x, y]) => (
        <circle key={`${x}-${y}`} cx={x} cy={y} r="3" fill="#0B2545" />
      ))}
      <circle cx="188" cy="18" r="3.6" fill="#0B2545" stroke="#087CA5" strokeWidth="1.5" />
    </svg>
  );
}

/**
 * The full editorial collage, layered strictly back to front:
 * 1 ivory page → 2 warm paper backing → 3 wide marble panel (gold veins
 * upper-left, turquoise counter-current inside its bounds) → 4 graph-paper
 * sheet tucked behind → 5 torn ivory base with tonal variation → 6 gold bars
 * as the focal point. One light source: soft warm light upper-left, shadows
 * falling lower-right.
 */
function HeroCollage() {
  return (
    <div className="relative mx-auto h-56 w-full max-w-md select-none sm:h-64 lg:h-72" aria-hidden="true">
      {/* 2 — warm rear paper backing */}
      <div className="absolute -left-[2%] top-3 h-[62%] w-[104%] rounded-[64px] bg-light-sand/50 blur-2xl" />
      {/* soft shadow pool under the panel */}
      <div className="absolute left-0 top-7 h-[58%] w-full rounded-[48px] bg-ocean-navy/15 blur-xl" />

      {/* 3 — wide organic marble panel, framing the bars on both sides.
          The "center" crop shows both natural gold-vein clusters of the shared
          source: one toward the lower-left, one toward the upper-right. */}
      <MarbleArtwork
        mask="panel"
        texture="ocean"
        crop="center"
        className="absolute left-0 top-6 h-[60%] w-full"
      />
      {/* turquoise counter-current, kept inside the panel's bounds */}
      <MarbleArtwork
        mask="panel"
        texture="teal"
        crop="right top"
        flip
        opacity={0.28}
        className="absolute left-[40%] top-[14%] h-[16%] w-[42%] hidden sm:block"
      />

      {/* 4 — graph-paper sheet, physically placed behind the base and bars */}
      <div className="absolute right-0 top-8 hidden w-[56%] rotate-[1.2deg] sm:block">
        <span
          className="absolute -top-1.5 left-1/2 z-10 h-3 w-12 -translate-x-1/2 -rotate-2 rounded-[1px] bg-light-sand/85 shadow-sm"
          aria-hidden="true"
        />
        <div className="rounded-sm bg-paper p-3 shadow-[0_10px_22px_-14px_rgba(11,37,69,0.45)] ring-1 ring-line/80">
          <GraphPaper className="h-auto w-full" />
        </div>
      </div>

      {/* 5 — torn ivory base: layered tonal silhouettes, soft fibrous grain */}
      <div className="absolute bottom-0 left-[4%] h-24 w-[74%] sm:h-28">
        <div className="marble-mask-paper absolute inset-0 bg-paper [filter:drop-shadow(0_12px_16px_rgba(11,37,69,0.32))]" />
        <div className="marble-mask-paper absolute inset-x-[5%] bottom-0 top-[20%] bg-light-sand/55" />
        <div
          className="marble-mask-paper absolute inset-0 opacity-60"
          style={{
            backgroundImage:
              "repeating-linear-gradient(92deg, rgba(23,36,58,0.025) 0 2px, transparent 2px 6px)",
          }}
        />
      </div>

      {/* 6 — gold bars, the focal point, grounded on the base */}
      <GoldBars className="absolute bottom-0 left-[12%] w-[56%]" />
    </div>
  );
}

export function HeroSection() {
  const [howOpen, setHowOpen] = useState(false);

  return (
    <section className="pt-2">
      <div className="mb-6 flex items-center gap-4">
        <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.28em] text-ocean-navy">
          MCX Gold Futures
        </p>
        <span className="h-px w-24 bg-ocean-teal" aria-hidden="true" />
      </div>

      <div className="grid items-center gap-8 lg:grid-cols-[1.15fr_1fr]">
        <div>
          <h1 className="font-display text-[3.4rem] font-bold leading-[1.02] tracking-tight sm:text-[4.6rem]">
            <span className="block text-ocean-navy">Decoding</span>
            <span className="block text-metallic-gold">Gold Markets</span>
          </h1>
          <p className="mt-4 max-w-md font-display text-lg italic leading-relaxed text-secondary-text">
            Compare contracts. Investigate unusual spreads.
            <br className="hidden sm:block" />
            Test ideas with evidence.
          </p>
          <div className="mt-7 flex flex-wrap items-center gap-3">
            <Link href="/spreads">
              <Button variant="primary" className="px-6" icon={<ArrowRight className="size-4" aria-hidden="true" />}>
                Start an Analysis
              </Button>
            </Link>
            <Button variant="outline" onClick={() => setHowOpen(true)} icon={<Play className="size-4" aria-hidden="true" />}>
              How It Works
            </Button>
          </div>
        </div>

        <div className="mt-2 lg:mt-0">
          <HeroCollage />
        </div>
      </div>

      <Modal
        open={howOpen}
        onClose={() => setHowOpen(false)}
        title="How AURUM IQ works"
        description="Five steps from a raw CSV to a claim you can defend."
      >
        <ol className="space-y-4">
          {STEPS.map((step, index) => (
            <li key={step.title} className="flex gap-3">
              <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-aqua-soft font-mono text-[0.6875rem] font-semibold text-ocean-blue">
                {String(index + 1).padStart(2, "0")}
              </span>
              <span>
                <span className="block text-sm font-semibold text-ocean-navy">{step.title}</span>
                <span className="mt-1 block text-[0.8125rem] leading-relaxed text-secondary-text">
                  {step.body}
                </span>
              </span>
            </li>
          ))}
        </ol>
        <p className="mt-5 rounded-md bg-aqua-soft/60 px-3 py-2 text-[0.75rem] leading-relaxed text-secondary-text">
          The gate is the same on every screen: an alert needs |z| ≥ 2 <em>and</em> an expected
          capture that still beats the full round-trip cost. If no edge survives, the desk says so.
        </p>
      </Modal>
    </section>
  );
}

export { STEPS as WORKFLOW_STEPS };
