"use client";

import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/cn";

interface ZGaugeProps {
  z: number;
  entryZ: number;
  exitZ: number;
  className?: string;
}

const MIN = -3.5;
const MAX = 3.5;

function position(value: number): number {
  const clamped = Math.max(MIN, Math.min(MAX, value));
  return ((clamped - MIN) / (MAX - MIN)) * 100;
}

/**
 * Horizontal z-scale: shaded entry zones beyond ±2, the exit threshold marked
 * inside them, and the current reading as an animated needle. The number is
 * printed at the needle, so colour is never the only signal.
 */
export function ZGauge({ z, entryZ, exitZ, className }: ZGaugeProps) {
  const reduce = useReducedMotion();
  const armed = Math.abs(z) >= entryZ;
  const left = position(z);

  return (
    <div className={cn("w-full", className)}>
      <div className="relative h-10">
        {/* Entry zones */}
        <div
          className="absolute inset-y-2 left-0 rounded-l-xs bg-gold/12"
          style={{ width: `${position(-entryZ)}%` }}
          aria-hidden="true"
        />
        <div
          className="absolute inset-y-2 right-0 rounded-r-xs bg-gold/12"
          style={{ width: `${100 - position(entryZ)}%` }}
          aria-hidden="true"
        />
        {/* Track */}
        <div className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-line-strong" aria-hidden="true" />
        {/* Exit marks */}
        {[-exitZ, exitZ].map((value) => (
          <div
            key={value}
            aria-hidden="true"
            className="absolute top-1/2 h-3 w-px -translate-y-1/2 bg-gold/45"
            style={{ left: `${position(value)}%` }}
          />
        ))}
        {/* Zero */}
        <div
          aria-hidden="true"
          className="absolute left-1/2 top-1/2 h-4 w-px -translate-x-1/2 -translate-y-1/2 bg-line-strong"
        />
        {/* Needle */}
        <motion.div
          className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2"
          initial={reduce ? false : { left: "50%" }}
          animate={{ left: `${left}%` }}
          transition={{ type: "spring", stiffness: 140, damping: 20, mass: 0.6 }}
        >
          <span
            className={cn(
              "flex items-center gap-1 rounded-xs border px-1.5 py-0.5 font-mono text-[0.6875rem] tabular-nums",
              armed ? "border-gold/60 bg-ink-800 text-gold-bright" : "border-line-strong bg-ink-800 text-ash",
            )}
          >
            {z >= 0 ? "+" : "−"}
            {Math.abs(z).toFixed(2)}σ
          </span>
        </motion.div>
      </div>

      <div className="relative mt-1 h-4">
        <span className="absolute left-0 font-mono text-[0.625rem] text-dim">−3.5</span>
        <span className="absolute left-1/2 -translate-x-1/2 font-mono text-[0.625rem] text-dim">0</span>
        <span className="absolute right-0 font-mono text-[0.625rem] text-dim">+3.5</span>
      </div>
      <div className="relative h-4">
        <span
          className="absolute -translate-x-1/2 font-mono text-[0.625rem] text-gold/70"
          style={{ left: `${position(-entryZ)}%` }}
        >
          −{entryZ.toFixed(1)}σ
        </span>
        <span
          className="absolute -translate-x-1/2 font-mono text-[0.625rem] text-gold/70"
          style={{ left: `${position(entryZ)}%` }}
        >
          +{entryZ.toFixed(1)}σ
        </span>
      </div>
    </div>
  );
}
