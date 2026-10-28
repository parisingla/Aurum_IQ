import type { Metadata, Viewport } from "next";
import { IBM_Plex_Mono, IBM_Plex_Sans, Playfair_Display } from "next/font/google";
import "./globals.css";
import { AppShell } from "@/components/layout/shell";
import { ToastProvider } from "@/components/ui/toast";

const sans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-plex-sans",
  display: "swap",
});

const mono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-plex-mono",
  display: "swap",
});

const display = Playfair_Display({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  style: ["normal", "italic"],
  variable: "--font-playfair",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Aurum IQ — MCX gold relative value",
    template: "%s · Aurum IQ",
  },
  description:
    "A relative-value research terminal for MCX gold futures: purity- and carry-adjusted spreads, cost-gated signals and walk-forward backtests on demo data.",
  applicationName: "Aurum IQ",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: "#FFF8EC",
  colorScheme: "light",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${sans.variable} ${mono.variable} ${display.variable}`}
    >
      <body className="min-h-screen">
        <a
          href="#page"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-xs focus:bg-gold focus:px-3 focus:py-2 focus:text-sm focus:text-ink-950"
        >
          Skip to content
        </a>
        <ToastProvider>
          <AppShell>
            <div id="page" tabIndex={-1}>
              {children}
            </div>
          </AppShell>
        </ToastProvider>
      </body>
    </html>
  );
}
