"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";
import { NAV_ITEMS } from "./nav-items";

function NavList({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <nav aria-label="Primary" className="flex flex-col gap-1">
      {NAV_ITEMS.map((item) => {
        const active =
          item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={cn(
              "group flex items-center gap-3 rounded-full px-3.5 py-2.5 transition-colors duration-150",
              active
                ? "bg-ocean-navy text-white-surface shadow-sm"
                : "text-ocean-navy hover:bg-pale-aqua",
            )}
          >
            <Icon
              className={cn("size-4 shrink-0", active ? "text-warm-gold" : "text-ocean-navy")}
              aria-hidden="true"
            />
            <span className="truncate text-[0.8125rem] font-medium leading-tight">
              {item.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}

/** Rail contents (desktop). */
export function SideNav() {
  return (
    <div className="px-3 pb-2 pt-2">
      <NavList />
    </div>
  );
}

/** Same list for the mobile drawer — the drawer closes itself after a tap. */
export function MobileNav({ onNavigate }: { onNavigate: () => void }) {
  return <NavList onNavigate={onNavigate} />;
}
