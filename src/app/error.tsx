"use client";

import Link from "next/link";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";

/**
 * Route-level error boundary. Next renders this instead of the page when a
 * client component throws during render — the page shell survives, so the
 * navigation and reload controls stay reachable.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // In a real deployment this is where the error would go to telemetry.
    console.error("Aurum IQ route error", error);
  }, [error]);

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-4 px-6 py-24">
      <p className="label-mono text-down">Render fault</p>
      <h1 className="font-display text-3xl leading-tight text-bone">
        This view stopped rendering.
      </h1>
      <p className="text-sm leading-relaxed text-ash">
        The shell is still up, so nothing else is lost. Retry the panel, or go back to the
        overview and work forward from there.
      </p>
      <p className="break-words rounded-xs border border-line bg-ink-850 px-3 py-2 font-mono text-[0.6875rem] text-dim">
        {error.message}
        {error.digest ? ` · digest ${error.digest}` : ""}
      </p>
      <div className="flex gap-2">
        <Button variant="primary" onClick={reset}>
          Retry
        </Button>
        <Link href="/">
          <Button variant="outline">Back to overview</Button>
        </Link>
      </div>
    </div>
  );
}
