import {
  ArrowLeftRight,
  BookOpen,
  CalendarDays,
  FlaskConical,
  House,
  Layers3,
  Sparkles,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  hint: string;
  icon: LucideIcon;
}

/**
 * The seven research surfaces, in workflow order:
 * observe → inspect → compare → read the curve → test → ask → document.
 * /signals stays a live route (linked from Spread Lab anomalies) but is not primary nav.
 */
export const NAV_ITEMS: readonly NavItem[] = [
  { href: "/", label: "Overview", hint: "The research desk at a glance", icon: House },
  { href: "/contracts", label: "Contract Explorer", hint: "Understand each contract first", icon: Layers3 },
  { href: "/spreads", label: "Spread Lab", hint: "Compare a pair, see the math", icon: ArrowLeftRight },
  { href: "/term-structure", label: "Term Structure", hint: "Curves, carry and expiries", icon: CalendarDays },
  { href: "/backtesting", label: "Backtesting", hint: "Test a rule after costs", icon: FlaskConical },
  { href: "/assistant", label: "AI Research Assistant", hint: "Grounded research queries", icon: Sparkles },
  { href: "/research", label: "Methodology & Data", hint: "Method, limits, sources", icon: BookOpen },
];

export function titleForPath(pathname: string): NavItem | undefined {
  if (pathname === "/") return NAV_ITEMS[0];
  return NAV_ITEMS.find((item) => item.href !== "/" && pathname.startsWith(item.href));
}
