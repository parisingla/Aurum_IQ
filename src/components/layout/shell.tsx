"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Modal } from "@/components/ui/modal";
import { cn } from "@/lib/cn";
import { DATA_MODE } from "@/lib/api";
import { AS_OF } from "@/lib/mock/seed";
import { formatDate } from "@/lib/format";
import { titleForPath } from "./nav-items";
import { SiteFooter } from "./footer";
import { MobileNav, SideNav } from "./side-nav";
import { TopBar } from "./top-bar";

/* -------------------------------------------------------------------------- */
/* Shell state: navigation drawer, refresh nonce, page heading                 */
/* -------------------------------------------------------------------------- */

interface ShellApi {
  refreshNonce: number;
  refresh: () => void;
  navOpen: boolean;
  setNavOpen: (open: boolean) => void;
}

const ShellContext = createContext<ShellApi | null>(null);

export function useShell(): ShellApi {
  const context = useContext(ShellContext);
  if (!context) throw new Error("useShell must be used inside <AppShell>");
  return context;
}

/** Data hooks add this to their dependency list so the top-bar refresh works. */
export function useRefreshNonce(): number {
  return useShell().refreshNonce;
}

/* -------------------------------------------------------------------------- */
/* Chrome                                                                      */
/* -------------------------------------------------------------------------- */

function Wordmark() {
  return (
    <Link href="/" className="flex items-baseline gap-2 px-2.5 pb-4 pt-5">
      <span className="font-display text-lg leading-none tracking-tight text-bone">
        Aurum<span className="text-gold">IQ</span>
      </span>
      <span className="label-mono hidden text-[0.625rem] text-dim sm:inline">
        MCX relative value
      </span>
    </Link>
  );
}

function Rail() {
  return (
    <aside className="sticky top-0 hidden h-screen w-56 shrink-0 flex-col border-r border-line bg-ink-900 lg:flex">
      <Wordmark />
      <div className="scroll-thin min-h-0 flex-1 overflow-y-auto">
        <SideNav />
      </div>
      <div className="border-t border-line px-3 py-3">
        <p className="label-mono">Fixture set</p>
        <p className="mt-1 font-mono text-[0.6875rem] tabular-nums text-ash">
          {formatDate(AS_OF)} · 15:30 IST
        </p>
        <p className="mt-1 text-[0.625rem] leading-snug text-dim">
          {DATA_MODE === "api"
            ? "HTTP API mode (NEXT_PUBLIC_API_BASE_URL set)."
            : "Local fixtures — no network calls."}
        </p>
      </div>
    </aside>
  );
}

/* -------------------------------------------------------------------------- */
/* Shell                                                                       */
/* -------------------------------------------------------------------------- */

function AppShellInner({ children }: { children: ReactNode }) {
  const { navOpen, setNavOpen, refresh } = useShell();
  const pathname = usePathname();
  const navItem = titleForPath(pathname);

  return (
    <div className="flex min-h-screen min-w-0">
      <Rail />
      <Modal
        open={navOpen}
        onClose={() => setNavOpen(false)}
        title="Aurum IQ"
        description="Relative-value research terminal"
        width="19rem"
      >
        <MobileNav onNavigate={() => setNavOpen(false)} />
      </Modal>

      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar
          title={navItem?.label ?? "Aurum IQ"}
          subtitle={navItem?.hint}
          onMenu={() => setNavOpen(true)}
          onRefresh={refresh}
        />
        <main className="min-w-0 flex-1">{children}</main>
        <SiteFooter onRefresh={refresh} />
      </div>
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const [refreshNonce, setRefreshNonce] = useState(0);
  const [navOpen, setNavOpen] = useState(false);

  const refresh = useCallback(() => setRefreshNonce((n) => n + 1), []);

  const api = useMemo<ShellApi>(
    () => ({ refreshNonce, refresh, navOpen, setNavOpen }),
    [refreshNonce, refresh, navOpen],
  );

  // Cmd/Ctrl + Shift + R reloads every panel without a full page load.
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.shiftKey && event.key.toLowerCase() === "r") {
        event.preventDefault();
        setRefreshNonce((n) => n + 1);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <ShellContext.Provider value={api}>
      <AppShellInner>{children}</AppShellInner>
    </ShellContext.Provider>
  );
}

/* -------------------------------------------------------------------------- */
/* Page wrapper                                                                */
/* -------------------------------------------------------------------------- */

interface PageShellProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
  /** Extra top-right content on the page header row. */
  actions?: ReactNode;
  className?: string;
}

/**
 * Standard page frame: registers the heading with the top bar and lays out the
 * page header. Panels inside provide their own titles.
 */
export function PageShell({ title, subtitle, children, actions, className }: PageShellProps) {
  return (
    <div className={cn("px-4 py-6 sm:px-6", className)}>
      {(actions || subtitle) && (
        <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="font-display text-2xl leading-tight tracking-tight text-bone">{title}</p>
            {subtitle && (
              <p className="mt-1.5 max-w-3xl text-sm leading-relaxed text-dim">{subtitle}</p>
            )}
          </div>
          {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
        </div>
      )}
      <div className="space-y-4">{children}</div>
    </div>
  );
}
