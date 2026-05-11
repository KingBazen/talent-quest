"use client";

import Image from "next/image";
import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

type Variant = "icon" | "lockup" | "stacked";

interface BlingLogoProps {
  variant?: Variant;
  size?: number;
  className?: string;
  /** Hover/glow animation on the mark. Auto-disabled if user prefers reduced motion. */
  animated?: boolean;
  /** Gold ring on the icon-variant tile. Off makes the mark sit flush with the page. */
  showRing?: boolean;
}

/**
 * Renders the official BLING RECORDS mark.
 *
 * Source: extracted from the partnership deck (`bling_records.pdf`, page 8) and
 * cropped into three transparent PNG assets under `/brand/`. The original deck
 * art is the source of truth — when a higher-resolution or vector original
 * lands, swap the file paths below; the component API stays the same.
 *
 * - `icon`    : silhouette tile only (use in nav, avatars, favicons).
 * - `lockup`  : icon + "BLING RECORDS" inline (use in headers, emails).
 * - `stacked` : icon centered above the wordmark (use as hero / footer mark).
 */
export function BlingLogo({
  variant = "icon",
  size = 40,
  className,
  animated = true,
  showRing = true,
}: BlingLogoProps) {
  const reduce = useReducedMotion();
  const useAnim = animated && !reduce;

  if (variant === "icon") {
    return (
      <BlingMark
        size={size}
        className={className}
        animated={useAnim}
        showRing={showRing}
      />
    );
  }

  if (variant === "lockup") {
    // Inline mark + standalone wordmark image. We size the wordmark off the
    // icon's height so a single `size` prop drives the whole lockup.
    const wordH = Math.round(size * 0.78);
    return (
      <span className={cn("inline-flex items-center gap-3", className)}>
        <BlingMark size={size} animated={useAnim} showRing={showRing} />
        <Image
          src="/brand/bling-records-wordmark.png"
          alt="BLING RECORDS"
          width={Math.round(wordH * (1200 / 505))}
          height={wordH}
          priority
          className="select-none"
        />
      </span>
    );
  }

  // stacked — composite (silhouette + wordmark) is already a single asset, so
  // we render it as one square image. Cheaper than re-stacking the parts and
  // matches the deck artwork pixel-for-pixel.
  return (
    <motion.span
      className={cn("inline-flex shrink-0", className)}
      style={{ width: size, height: size }}
      whileHover={useAnim ? { scale: 1.02 } : undefined}
      transition={{ type: "spring", stiffness: 240, damping: 18 }}
      aria-label="Bling Records"
    >
      <Image
        src="/brand/bling-records-full.png"
        alt="Bling Records"
        width={size}
        height={size}
        priority
        className="select-none"
        style={{ objectFit: "contain" }}
      />
    </motion.span>
  );
}

/* -------------------------------------------------------------------------- */
/*  Silhouette mark — gold-on-black tile                                      */
/* -------------------------------------------------------------------------- */

function BlingMark({
  size,
  className,
  animated,
  showRing,
}: {
  size: number;
  className?: string;
  animated: boolean;
  showRing: boolean;
}) {
  return (
    <motion.span
      className={cn(
        // Black backdrop preserves the on-deck look; the silhouette PNG is
        // gold-on-transparent so the radial darkens edges into the tile.
        "relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-2xl",
        "bg-[radial-gradient(circle_at_30%_25%,#1a1a1a,#050505_70%)]",
        "shadow-[0_8px_24px_-8px_rgba(234,179,8,0.55)]",
        className
      )}
      style={{ width: size, height: size }}
      whileHover={animated ? { scale: 1.04, rotate: -2 } : undefined}
      transition={{ type: "spring", stiffness: 280, damping: 18 }}
      aria-label="Bling Records"
    >
      {showRing && (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-2xl ring-1 ring-inset ring-[rgba(234,179,8,0.35)]"
        />
      )}

      <Image
        src="/brand/bling-records-mark.png"
        alt=""
        // Source crop is 800×463 (~1.73:1). The mark naturally wants to sit
        // slightly above center inside the square so the hat reads, so we
        // bias the contain box accordingly.
        width={size}
        height={size}
        priority
        className="select-none"
        style={{
          objectFit: "contain",
          objectPosition: "center 38%",
          padding: Math.round(size * 0.08),
        }}
      />
    </motion.span>
  );
}
