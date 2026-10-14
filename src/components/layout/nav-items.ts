import { ArrowDownUp, BellRing, LayoutDashboard, Rows3, ScrollText } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  hint: string;
  icon: LucideIcon;
}

/** Ordered exactly like the analyst's workflow: observe → inspect → compare → act → document. */
export const NAV_ITEMS: readonly NavItem[] = [
  { href: "/", label: "Overview", hint: "The desk at a glance", icon: LayoutDashboard },
  { href: "/contracts", label: "Contracts", hint: "All five products, live rows", icon: Rows3 },
  { href: "/spreads", label: "Spreads", hint: "Pair analytics & calculation", icon: ArrowDownUp },
  { href: "/signals", label: "Signals", hint: "Gated alerts & backtests", icon: BellRing },
  { href: "/research", label: "Research", hint: "Method, limits, sources", icon: ScrollText },
];

export function titleForPath(pathname: string): NavItem | undefined {
  if (pathname === "/") return NAV_ITEMS[0];
  return NAV_ITEMS.find((item) => item.href !== "/" && pathname.startsWith(item.href));
}
