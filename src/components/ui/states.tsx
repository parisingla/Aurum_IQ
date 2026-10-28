import type { CSSProperties, ReactNode } from "react";
import { AlertTriangle, Inbox, RefreshCw } from "lucide-react";
import { cn } from "@/lib/cn";
import { Button } from "./button";

export function Skeleton({ className, style }: { className?: string; style?: CSSProperties }) {
  return (
    <div
      className={cn("animate-pulse rounded-xs bg-ink-750", className)}
      style={style}
      aria-hidden="true"
    />
  );
}

export function PanelSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-3" role="status" aria-label="Loading panel">
      <Skeleton className="h-3 w-24" />
      <Skeleton className="h-3 w-1/3" />
      <div className="space-y-2">
        {Array.from({ length: rows }, (_, i) => (
          <Skeleton key={i} className="h-8 w-full" />
        ))}
      </div>
      <span className="sr-only">Loading demo data…</span>
    </div>
  );
}

export function ChartSkeleton({ height = 220 }: { height?: number }) {
  return (
    <div
      className="flex items-end gap-1.5"
      style={{ height }}
      role="status"
      aria-label="Loading chart"
    >
      {Array.from({ length: 24 }, (_, i) => (
        <Skeleton
          key={i}
          className="flex-1"
          // Deterministic, non-jittering placeholder heights.
          style={{ height: `${28 + ((i * 37) % 60)}%` }}
        />
      ))}
      <span className="sr-only">Loading chart…</span>
    </div>
  );
}

interface EmptyStateProps {
  title: string;
  hint?: string;
  action?: ReactNode;
  icon?: ReactNode;
  compact?: boolean;
}

export function EmptyState({ title, hint, action, icon, compact }: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-xs border border-dashed border-line text-center",
        compact ? "gap-1.5 px-4 py-6" : "gap-2 px-6 py-10",
      )}
    >
      <span className="text-dim" aria-hidden="true">
        {icon ?? <Inbox className="size-4" />}
      </span>
      <p className="text-sm text-ash">{title}</p>
      {hint && <p className="max-w-md text-xs leading-relaxed text-dim">{hint}</p>}
      {action}
    </div>
  );
}

interface ErrorStateProps {
  message?: string;
  onRetry?: () => void;
  title?: string;
  compact?: boolean;
}

export function ErrorState({
  message,
  onRetry,
  title = "Could not load this panel",
  compact,
}: ErrorStateProps) {
  return (
    <div
      role="alert"
      className={cn(
        "flex flex-col gap-2 rounded-xs border border-down/30 bg-down/5",
        compact ? "px-3 py-3" : "px-4 py-5",
      )}
    >
      <div className="flex items-center gap-2">
        <AlertTriangle className="size-3.5 text-down" aria-hidden="true" />
        <p className="text-sm text-bone">{title}</p>
      </div>
      {message && (
        <p className="text-xs leading-relaxed text-ash break-words">{message}</p>
      )}
      {onRetry && (
        <div className="pt-1">
          <Button size="sm" onClick={onRetry} icon={<RefreshCw className="size-3.5" />}>
            Retry
          </Button>
        </div>
      )}
    </div>
  );
}

/** Loading / error / empty in one place so every panel behaves the same. */
export function AsyncBoundary<T>({
  loading,
  error,
  data,
  onRetry,
  empty,
  skeleton,
  children,
}: {
  loading: boolean;
  error: string | null;
  data: T | null;
  onRetry?: () => void;
  empty?: { title: string; hint?: string };
  skeleton?: ReactNode;
  children: (value: T) => ReactNode;
}) {
  if (loading && data === null) return <>{skeleton ?? <PanelSkeleton />}</>;
  if (error && data === null) return <ErrorState message={error} onRetry={onRetry} />;
  if (data === null) {
    return <EmptyState title={empty?.title ?? "Nothing to show"} hint={empty?.hint} />;
  }
  const isEmpty = Array.isArray(data) && data.length === 0;
  if (isEmpty && empty) {
    return <EmptyState title={empty.title} hint={empty.hint} />;
  }
  return (
    <>
      {error && (
        <div className="mb-3">
          <ErrorState message={error} onRetry={onRetry} compact />
        </div>
      )}
      {children(data)}
    </>
  );
}
