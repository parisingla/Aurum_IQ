import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

interface PanelProps {
  /** Small mono eyebrow above the title. */
  eyebrow?: string;
  title?: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
  /** Set false for panels whose header lives in the page, not the panel. */
  padded?: boolean;
  id?: string;
}

export function Panel({
  eyebrow,
  title,
  description,
  actions,
  children,
  className,
  bodyClassName,
  padded = true,
  id,
}: PanelProps) {
  const hasHeader = Boolean(eyebrow || title || description || actions);

  return (
    <section
      id={id}
      className={cn(
        "flex min-w-0 flex-col border border-line bg-ink-850 rounded-md",
        className,
      )}
    >
      {hasHeader && (
        <header className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-line px-4 py-3">
          <div className="min-w-0">
            {eyebrow && <p className="label-mono">{eyebrow}</p>}
            {title && (
              <h2 className="mt-0.5 text-sm font-medium tracking-tight text-bone">
                {title}
              </h2>
            )}
            {description && (
              <p className="mt-1 max-w-prose text-xs leading-relaxed text-dim">
                {description}
              </p>
            )}
          </div>
          {actions && (
            <div className="ml-auto flex items-center gap-2">{actions}</div>
          )}
        </header>
      )}
      <div className={cn(padded ? "p-4" : "p-0", "min-w-0 flex-1", bodyClassName)}>
        {children}
      </div>
    </section>
  );
}
