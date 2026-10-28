"use client";

import type { KeyboardEvent, ReactNode } from "react";
import { cn } from "@/lib/cn";

export interface SegmentOption<T extends string> {
  value: T;
  label: string;
  /** Short mono suffix, e.g. "6M" or "bps". */
  suffix?: string;
}

interface SegmentedProps<T extends string> {
  value: T;
  onChange: (value: T) => void;
  options: ReadonlyArray<SegmentOption<T>>;
  ariaLabel: string;
  className?: string;
  /** Larger hit targets on dense toolbars. */
  size?: "sm" | "md";
}

export function Segmented<T extends string>({
  value,
  onChange,
  options,
  ariaLabel,
  className,
  size = "sm",
}: SegmentedProps<T>) {
  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const index = options.findIndex((option) => option.value === value);
    if (index < 0) return;
    let next = index;
    if (event.key === "ArrowRight" || event.key === "ArrowDown") next = (index + 1) % options.length;
    else if (event.key === "ArrowLeft" || event.key === "ArrowUp")
      next = (index - 1 + options.length) % options.length;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = options.length - 1;
    else return;
    event.preventDefault();
    const target = options[next];
    if (target) onChange(target.value);
  }

  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      onKeyDown={onKeyDown}
      className={cn(
        "inline-flex items-center gap-0.5 rounded-xs border border-line bg-ink-800 p-0.5",
        className,
      )}
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            tabIndex={active ? 0 : -1}
            onClick={() => onChange(option.value)}
            className={cn(
              "rounded-xs font-mono tabular-nums transition-colors duration-150",
              size === "sm" ? "h-6 px-2 text-[0.6875rem]" : "h-7 px-2.5 text-xs",
              active
                ? "bg-ink-700 text-gold-bright shadow-[inset_0_0_0_1px_rgba(214,166,64,0.35)]"
                : "text-dim hover:text-ash",
            )}
          >
            {option.label}
            {option.suffix && <span className="ml-1 opacity-60">{option.suffix}</span>}
          </button>
        );
      })}
    </div>
  );
}

/** Wraps a control + supporting copy on one row (dense toolbar row). */
export function ToolbarRow({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("flex flex-wrap items-end gap-3", className)}>{children}</div>
  );
}
