import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-lg flex-col gap-4 px-6 py-24">
      <p className="label-mono text-dim">404</p>
      <h1 className="font-display text-3xl leading-tight text-bone">No such view.</h1>
      <p className="text-sm leading-relaxed text-ash">
        The terminal ships five views: Overview, Contracts, Spreads, Signals and Research.
        Nothing else exists yet — this is a demo build.
      </p>
      <Link href="/" className="w-fit">
        <Button variant="primary">Back to overview</Button>
      </Link>
    </div>
  );
}
