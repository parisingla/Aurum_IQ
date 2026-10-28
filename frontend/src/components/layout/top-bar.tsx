"use client";

import { useEffect, useRef, useState } from "react";
import { AlertTriangle, Bell, CheckCircle2, Menu, Upload } from "lucide-react";
import { DATA_MODE } from "@/lib/api";
import { cn } from "@/lib/cn";

export interface AppNotification {
  id: string;
  title: string;
  detail: string;
  tone: "warning" | "ok";
}

interface TopBarProps {
  title?: string;
  subtitle?: string;
  onMenu: () => void;
  onUpload?: () => void;
  notifications?: AppNotification[];
}

function NotificationBell({ notifications }: { notifications: AppNotification[] }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label={`Notifications (${notifications.length})`}
        className="relative rounded-full p-2 text-ocean-navy transition-colors hover:bg-aqua-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      >
        <Bell className="size-5" aria-hidden="true" />
        {notifications.length > 0 && (
          <span aria-hidden="true" className="absolute right-1.5 top-1.5 size-2 rounded-full bg-metallic-gold" />
        )}
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Notifications"
          className="absolute right-0 top-12 z-50 w-80 rounded-lg border border-line bg-white-surface p-4 shadow-xl"
        >
          <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.14em] text-secondary-text">
            Notifications
          </p>
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center gap-1.5 py-6 text-center">
              <CheckCircle2 className="size-5 text-positive" aria-hidden="true" />
              <p className="text-sm font-medium text-ocean-navy">All clear</p>
              <p className="text-[0.75rem] leading-snug text-secondary-text">
                No data-quality warnings or recent events right now.
              </p>
            </div>
          ) : (
            <ul className="mt-2 max-h-72 space-y-2.5 overflow-y-auto scroll-thin">
              {notifications.map((notification) => (
                <li key={notification.id} className="flex gap-2.5 rounded-md bg-ivory-50 p-2.5">
                  {notification.tone === "warning" ? (
                    <AlertTriangle className="mt-0.5 size-4 shrink-0 text-metallic-gold" aria-hidden="true" />
                  ) : (
                    <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-positive" aria-hidden="true" />
                  )}
                  <span className="min-w-0">
                    <span className="block text-[0.8125rem] font-medium leading-tight text-ocean-navy">
                      {notification.title}
                    </span>
                    <span className="mt-0.5 block text-[0.6875rem] leading-snug text-secondary-text">
                      {notification.detail}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

export function TopBar({ title, subtitle, onMenu, onUpload, notifications = [] }: TopBarProps) {
  return (
    <header className="sticky top-0 z-30 bg-ivory-50/90 backdrop-blur-sm">
      <div className="flex h-16 items-center gap-3 px-5 sm:px-8">
        <button
          type="button"
          onClick={onMenu}
          className="-ml-1 rounded-full p-2 text-ocean-navy transition-colors hover:bg-aqua-soft lg:hidden"
          aria-label="Open navigation"
        >
          <Menu className="size-4" aria-hidden="true" />
        </button>

        {title && (
          <div className="min-w-0">
            <h1 className="truncate font-display text-lg font-semibold tracking-tight text-ocean-navy">
              {title}
            </h1>
            {subtitle && (
              <p className="mt-0.5 truncate text-[0.6875rem] text-secondary-text">{subtitle}</p>
            )}
          </div>
        )}

        <div className="ml-auto flex items-center gap-2.5 sm:gap-3.5">
          {!title && (
            <span
              className={cn(
                "hidden text-[0.6875rem] font-medium uppercase tracking-[0.14em] text-secondary-text md:inline",
              )}
              title={
                DATA_MODE === "api"
                  ? "Figures are served by the FastAPI engine."
                  : "Every figure on this site is fixture data, not a live MCX feed."
              }
            >
              {DATA_MODE === "api" ? "Live API" : "Illustrative demo data"}
            </span>
          )}

          {onUpload && (
            <button
              type="button"
              onClick={onUpload}
              className="inline-flex h-10 items-center gap-2 rounded-full border border-ocean-navy/30 bg-white-surface px-4 text-sm font-medium text-ocean-navy transition-colors hover:border-ocean-navy/60 hover:bg-aqua-soft/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              <Upload className="size-4" aria-hidden="true" />
              Upload Data (CSV)
            </button>
          )}

          <NotificationBell notifications={notifications} />
        </div>
      </div>
      <div className={cn("mx-5 h-px bg-line sm:mx-8", title ? "block" : "hidden")} aria-hidden="true" />
    </header>
  );
}
