import type { CSSProperties } from "react";
import { cn } from "@/lib/cn";

/**
 * MarbleArtwork — the shared rendering layer for the AURUM IQ marble family.
 *
 * All marble decoration in the product goes through this component so the
 * texture source, masking silhouette, cropping and opacity behave identically
 * everywhere. The outer box clips and masks; the inner layer carries the
 * texture so crops and flips never distort the mask itself.
 *
 * Purely decorative: aria-hidden and pointer-events-none by contract.
 */
export type MarbleTexture = "ocean" | "teal" | "navy" | "gold";
export type MarbleMask = "wave" | "panel" | "edge" | "fragment" | "paper" | "vein";

const MASK_CLASS: Record<MarbleMask, string> = {
  wave: "marble-mask-wave",
  panel: "marble-mask-panel",
  edge: "marble-mask-edge",
  fragment: "marble-mask-fragment",
  paper: "marble-mask-paper",
  vein: "marble-mask-vein",
};

/** Deliberate crops of the shared 1200×900 source, chosen for its formations. */
export type MarbleCrop =
  | "left top"
  | "center top"
  | "right top"
  | "left center"
  | "center"
  | "right center"
  | "left bottom"
  | "center bottom"
  | "right bottom";

interface MarbleArtworkProps {
  mask: MarbleMask;
  texture?: MarbleTexture;
  crop?: MarbleCrop;
  /** Mirror the texture without mirroring the silhouette. */
  flip?: boolean;
  opacity?: number;
  className?: string;
  style?: CSSProperties;
}

export function MarbleArtwork({
  mask,
  texture = "ocean",
  crop = "center",
  flip = false,
  opacity = 0.94,
  className,
  style,
}: MarbleArtworkProps) {
  return (
    <div
      aria-hidden="true"
      className={cn("pointer-events-none overflow-hidden", MASK_CLASS[mask], className)}
      style={style}
    >
      <div
        className={cn("h-full w-full", flip && "-scale-x-100")}
        style={{
          backgroundImage: `url(/textures/marble-${texture}.svg)`,
          backgroundSize: "cover",
          backgroundPosition: crop,
          opacity,
        }}
      />
    </div>
  );
}
