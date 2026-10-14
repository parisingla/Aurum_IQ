"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";
import { NAV_ITEMS } from "./nav-items";

function NavList({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <nav aria-label="Primary" className="flex flex-col gap-0.5">
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
              "group relative flex items-center gap-2.5 rounded-xs px-2.5 py-2 transition-colors duration-150",
              active ? "bg-ink-800 text-bone" : "text-ash hover:bg-ink-850 hover:text-bone",
            )}
          >
            <span
              aria-hidden="true"
              className={cn(
                "absolute left-0 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-full transition-colors",
                active ? "bg-gold" : "bg-transparent group-hover:bg-line-strong",
              )}
            />
            <Icon
              className={cn("size-4 shrink-0", active ? "text-gold" : "text-dim")}
              aria-hidden="true"
            />
            <span className="min-w-0 flex-1">
              <span className="block text-[0.8125rem] leading-tight">{item.label}</span>
              <span className="mt-0.5 block truncate text-[0.625rem] leading-tight text-dim">
                {item.hint}
              </span>
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
    <div className="px-2.5 pb-3 pt-4">
      <NavList />
    </div>
  );
}

/** Same list for the mobile drawer — the drawer closes itself after a tap. */
export function MobileNav({ onNavigate }: { onNavigate: () => void }) {
  return <NavList onNavigate={onNavigate} />;
}
