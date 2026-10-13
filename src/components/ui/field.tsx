"use client";

import type { ChangeEvent, ReactNode } from "react";
import { Search } from "lucide-react";
import { cn } from "@/lib/cn";

interface FieldShellProps {
  id: string;
  label: string;
  hint?: string;
  error?: string | null;
  children: ReactNode;
  className?: string;
}

export function FieldShell({ id, label, hint, error, children, className }: FieldShellProps) {
  return (
    <div className={cn("flex min-w-0 flex-col gap-1", className)}>
      <label htmlFor={id} className="label-mono text-ash">
        {label}
      </label>
      {children}
      {error ? (
        <p id={`${id}-error`} role="alert" className="text-[0.6875rem] leading-snug text-down">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-[0.6875rem] leading-snug text-dim">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

const CONTROL =
  "h-8 w-full min-w-0 rounded-xs border border-line-strong bg-ink-800 px-2 text-xs text-bone " +
  "placeholder:text-dim transition-colors focus:border-gold/60 focus:outline-none focus-visible:outline-2 " +
  "focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-50";

interface SelectFieldProps<T extends string> {
  id: string;
  label: string;
  value: T;
  onChange: (value: T) => void;
  options: ReadonlyArray<{ value: T; label: string }>;
  hint?: string;
  error?: string | null;
  className?: string;
}

export function SelectField<T extends string>({
  id,
  label,
  value,
  onChange,
  options,
  hint,
  error,
  className,
}: SelectFieldProps<T>) {
  return (
    <FieldShell id={id} label={label} hint={hint} error={error} className={className}>
      <select
        id={id}
        className={cn(CONTROL, "appearance-none pr-6", "font-mono")}
        value={value}
        onChange={(event: ChangeEvent<HTMLSelectElement>) =>
          onChange(event.target.value as T)
        }
        style={{
          backgroundImage:
            "linear-gradient(45deg, transparent 50%, var(--color-dim) 50%), linear-gradient(135deg, var(--color-dim) 50%, transparent 50%)",
          backgroundPosition: "right 11px center, right 7px center",
          backgroundSize: "4px 4px, 4px 4px",
          backgroundRepeat: "no-repeat",
        }}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value} className="bg-ink-800">
            {option.label}
          </option>
        ))}
      </select>
    </FieldShell>
  );
}

interface NumberFieldProps {
  id: string;
  label: string;
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step?: number;
  suffix?: string;
  error?: string | null;
  hint?: string;
  className?: string;
}

export function NumberField({
  id,
  label,
  value,
  onChange,
  min,
  max,
  step = 0.1,
  suffix,
  error,
  hint,
  className,
}: NumberFieldProps) {
  return (
    <FieldShell id={id} label={label} hint={hint} error={error} className={className}>
      <div className="relative">
        <input
          id={id}
          type="number"
          inputMode="decimal"
          min={min}
          max={max}
          step={step}
          value={Number.isFinite(value) ? value : ""}
          onChange={(event) => {
            const next = Number(event.target.value);
            onChange(Number.isFinite(next) ? next : min);
          }}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
          className={cn(CONTROL, "font-mono tabular-nums", suffix && "pr-9")}
        />
        {suffix && (
          <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 font-mono text-[0.6875rem] text-dim">
            {suffix}
          </span>
        )}
      </div>
    </FieldShell>
  );
}

interface SearchFieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function SearchField({ id, label, value, onChange, placeholder, className }: SearchFieldProps) {
  return (
    <FieldShell id={id} label={label} className={className}>
      <div className="relative">
        <Search
          className="pointer-events-none absolute left-2 top-1/2 size-3.5 -translate-y-1/2 text-dim"
          aria-hidden="true"
        />
        <input
          id={id}
          type="search"
          value={value}
          placeholder={placeholder}
          onChange={(event) => onChange(event.target.value)}
          className={cn(CONTROL, "pl-7")}
        />
      </div>
    </FieldShell>
  );
}
