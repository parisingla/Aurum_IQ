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
import { Upload, RefreshCw, CheckCircle2 } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { MarbleArtwork } from "@/components/ui/marble";
import { cn } from "@/lib/cn";
import { API_BASE_URL, fetchDataStatus, fetchAlerts } from "@/lib/api";
import type { DataStatus } from "@/lib/types";
import { useAsync } from "@/lib/hooks";
import { titleForPath } from "./nav-items";
import { SiteFooter } from "./footer";
import { MobileNav, SideNav } from "./side-nav";
import { TopBar, type AppNotification } from "./top-bar";
import { DatasetGate, type DatasetState } from "./dataset-gate";

/* -------------------------------------------------------------------------- */
/* Shell state: navigation drawer, refresh nonce, page heading                 */
/* -------------------------------------------------------------------------- */

interface ShellApi {
  refreshNonce: number;
  refresh: () => void;
  navOpen: boolean;
  setNavOpen: (open: boolean) => void;
  uploadOpen: boolean;
  setUploadOpen: (open: boolean) => void;
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

/** Opens the dataset upload modal from anywhere in the app. */
export function useUpload(): () => void {
  const api = useShell();
  return useCallback(() => api.setUploadOpen(true), [api]);
}

/* -------------------------------------------------------------------------- */
/* Upload Dataset Component                                                    */
/* -------------------------------------------------------------------------- */

/** FastAPI 409/422 detail is a string or {message, errors[]} — flatten it. */
async function uploadErrorMessage(response: Response): Promise<string> {
  try {
    const body: unknown = await response.json();
    const detail = (body as { detail?: unknown }).detail;
    if (typeof detail === "string") return detail;
    if (detail && typeof detail === "object") {
      const { message, errors } = detail as { message?: string; errors?: string[] };
      return [message, ...(errors ?? []).slice(0, 3)].filter(Boolean).join(" — ");
    }
  } catch {
    /* non-JSON error body */
  }
  return `Upload failed (HTTP ${response.status}). Is the engine deployed?`;
}

function UploadDataset({ onClose }: { onClose: () => void }) {
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { refresh } = useShell();

  const handleUpload = async (file: File) => {
    setUploading(true);
    setError(null);
    setSummary(null);

    try {
      const form = new FormData();
      form.append("file", file, file.name);
      const response = await fetch(`${API_BASE_URL}/api/datasets/upload`, {
        method: "POST",
        body: form,
        cache: "no-store",
      });
      if (!response.ok) throw new Error(await uploadErrorMessage(response));
      const payload = (await response.json()) as {
        dataset: { rows: number; fromDate: string; toDate: string };
      };
      setSummary(
        `Loaded ${payload.dataset.rows.toLocaleString()} rows · ${payload.dataset.fromDate} → ${payload.dataset.toDate}`,
      );
      refresh();
      setTimeout(onClose, 1200);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    
    const file = e.dataTransfer.files[0];
    if (file && file.name.endsWith(".csv")) {
      handleUpload(file);
    } else {
      setError("Please upload a CSV file");
    }
  };

  return (
    <div className="space-y-4">
      <div
        onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
        onDragLeave={() => setDragActive(false)}
        onDrop={handleDrop}
        className={cn(
          "relative rounded-md border-2 border-dashed p-8 text-center transition-colors",
          dragActive ? "border-metallic-gold bg-gold/5" : "border-line bg-ivory-50"
        )}
      >
        <Upload className="mx-auto mb-3 size-10 text-secondary-text" aria-hidden="true" />
        <p className="mb-2 text-sm text-ocean-navy">
          Drop MCX bhavcopy CSV here
        </p>
        <p className="text-xs text-secondary-text">
          or click to browse
        </p>
        <input
          type="file"
          accept=".csv"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleUpload(file);
          }}
          className="absolute inset-0 cursor-pointer opacity-0"
          disabled={uploading}
        />
      </div>

      {error && (
        <div className="rounded-xs border border-down/30 bg-down/10 px-3 py-2">
          <p className="text-xs text-down">{error}</p>
        </div>
      )}

      {summary && !error && (
        <div className="rounded-xs border border-up/30 bg-up/10 px-3 py-2">
          <p className="flex items-center gap-1.5 text-xs text-up">
            <CheckCircle2 className="size-3.5" aria-hidden="true" />
            {summary}
          </p>
        </div>
      )}

      {uploading && (
        <div className="flex items-center gap-2">
          <RefreshCw className="size-3 animate-spin text-metallic-gold" />
          <p className="text-xs text-secondary-text">Processing…</p>
        </div>
      )}

      <div className="space-y-1.5 text-xs text-secondary-text">
        <p className="font-mono text-ocean-navy">Expected format:</p>
        <ul className="ml-3 space-y-1">
          <li>• Date-wise MCX bhavcopy (27 Oct 2026 style) or the column layout below</li>
          <li>• Symbol, Trade Date, Expiry, Open, High, Low, Close, Volume, OI</li>
          <li>• Dates: DD-MMM-YYYY, YYYY-MM-DD, DD/MM/YYYY, or &quot;27 Oct 2026&quot;</li>
          <li>• Option-chain rows (CE/PE) are skipped automatically</li>
        </ul>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Chrome                                                                      */
/* -------------------------------------------------------------------------- */

function Wordmark() {
  return (
    <Link href="/" className="block border-b border-line px-4 pb-5 pt-6" aria-label="AURUM IQ home">
      <span className="flex items-start gap-2.5">
        <span aria-hidden="true" className="mt-0.5 shrink-0">
          <svg viewBox="0 0 28 24" className="size-7" fill="none">
            <path d="M2 20L10 7L14.5 14.5L17.5 10L26 20H2Z" stroke="#DDAF35" strokeWidth="2" strokeLinejoin="round" />
            <path d="M9 4.5L11.5 8.5" stroke="#DDAF35" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </span>
        <span className="min-w-0">
          <span className="block font-display text-lg font-bold leading-none tracking-wide text-ocean-navy">
            AURUM <span className="text-metallic-gold">IQ</span>
          </span>
        </span>
      </span>
      <span className="mt-2.5 block text-[0.5625rem] font-semibold uppercase leading-[1.6] tracking-[0.18em] text-secondary-text">
        Commodity
        <br />
        Derivatives
        <br />
        Intelligence
      </span>
    </Link>
  );
}

/**
 * Variant C — large geological fragment entering from the lower-left edge,
 * clipped at the sidebar and viewport boundaries. One deliberate composition:
 * the shared ocean marble with its gold-vein cluster visible via a deliberate
 * bottom crop, and the version footer layered on a readable gradient.
 */
function RailFragment({ dataSource }: { dataSource: DataStatus["source"] | null }) {
  const label =
    dataSource === "api"
      ? "Live MCX dataset"
      : dataSource === "empty"
        ? "No dataset — upload a CSV"
        : "Engine not connected";
  return (
    <div className="relative mt-4 h-[var(--marble-fragment-height)]" aria-hidden="true">
      <MarbleArtwork
        mask="fragment"
        texture="ocean"
        crop="left bottom"
        opacity={0.96}
        className="absolute inset-0"
      />
      <div className="absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-white-surface via-white-surface/92 to-transparent px-4 pb-3 pt-10">
        <p className="text-[0.625rem] font-semibold uppercase tracking-[0.12em] text-ocean-navy">
          Aurum IQ {APP_VERSION}
        </p>
        <p className="mt-1 text-[0.625rem] leading-snug text-secondary-text">
          {label}
        </p>
      </div>
    </div>
  );
}

const APP_VERSION = "v0.1.0";

function Rail({ dataSource }: { dataSource: DataStatus["source"] | null }) {
  return (
    <aside className="sticky top-0 hidden h-screen w-[250px] shrink-0 flex-col border-r border-line bg-white-surface lg:flex">
      <Wordmark />
      <div className="scroll-thin relative z-10 min-h-0 flex-1 overflow-y-auto bg-white-surface">
        <SideNav />
      </div>
      <RailFragment dataSource={dataSource} />
    </aside>
  );
}

/* -------------------------------------------------------------------------- */
/* Shell                                                                       */
/* -------------------------------------------------------------------------- */

function AppShellInner({ children }: { children: ReactNode }) {
  const { navOpen, setNavOpen, refresh, refreshNonce, uploadOpen, setUploadOpen } = useShell();
  const pathname = usePathname();
  const navItem = titleForPath(pathname);
  const alerts = useAsync(() => fetchAlerts(), [refreshNonce]);
  const status = useAsync(() => fetchDataStatus(), [refreshNonce]);

  // What the whole app shows: until a dataset is uploaded the gate replaces
  // every page — the terminal must not render a single invented number.
  const datasetState: DatasetState =
    status.data != null
      ? status.data.source === "api"
        ? "api"
        : "empty"
      : status.error != null
        ? "offline"
        : "loading";

  // Real notifications only: failed data-quality checks from the engine and
  // armed (non-info) alerts. No synthetic filler.
  const notifications: AppNotification[] = [];
  if (status.data) {
    for (const check of status.data.checks) {
      if (!check.passed) {
        notifications.push({
          id: `check-${check.label}`,
          title: `Data check failed: ${check.label}`,
          detail: check.detail,
          tone: "warning",
        });
      }
    }
  }
  if (alerts.data) {
    for (const alert of alerts.data) {
      if (alert.severity !== "info" && alert.status === "open") {
        notifications.push({
          id: `alert-${alert.id}`,
          title: alert.title,
          detail: alert.summary,
          tone: "warning",
        });
      }
    }
  }

  return (
    <div className="flex min-h-screen min-w-0">
      <Rail dataSource={datasetState === "api" || datasetState === "empty" ? datasetState : null} />
      <Modal
        open={navOpen}
        onClose={() => setNavOpen(false)}
        title="AURUM IQ"
        description="Commodity Derivatives Intelligence"
        width="19rem"
      >
        <MobileNav onNavigate={() => setNavOpen(false)} />
      </Modal>

      <Modal
        open={uploadOpen}
        onClose={() => setUploadOpen(false)}
        title="Upload dataset"
        description="Import MCX bhavcopy CSV files"
        side="center"
        width="32rem"
      >
        <UploadDataset onClose={() => setUploadOpen(false)} />
      </Modal>
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar
          title={pathname === "/" ? undefined : navItem?.label ?? "AURUM IQ"}
          subtitle={pathname === "/" ? undefined : navItem?.hint}
          onMenu={() => setNavOpen(true)}
          onUpload={() => setUploadOpen(true)}
          notifications={notifications}
          dataSource={status.data?.source ?? null}
        />
        <main className="min-w-0 flex-1">
          {datasetState === "api" ? (
            children
          ) : (
            <DatasetGate state={datasetState} detail={status.error ?? undefined} />
          )}
        </main>
        <SiteFooter onRefresh={refresh} status={status.data} />
      </div>
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const [refreshNonce, setRefreshNonce] = useState(0);
  const [navOpen, setNavOpen] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);

  const refresh = useCallback(() => setRefreshNonce((n) => n + 1), []);

  const api = useMemo<ShellApi>(
    () => ({ refreshNonce, refresh, navOpen, setNavOpen, uploadOpen, setUploadOpen }),
    [refreshNonce, refresh, navOpen, uploadOpen],
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
  /** Omit on pages that render their own hero (e.g. Overview). */
  title?: string;
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
      {title && (actions || subtitle) && (
        <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="font-display text-2xl leading-tight tracking-tight text-ocean-navy">{title}</p>
            {subtitle && (
              <p className="mt-1.5 max-w-3xl text-sm leading-relaxed text-secondary-text">{subtitle}</p>
            )}
          </div>
          {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
        </div>
      )}
      <div className="space-y-4">{children}</div>
    </div>
  );
}
