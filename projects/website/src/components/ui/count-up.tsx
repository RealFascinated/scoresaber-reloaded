"use client";

import { cn } from "@/common/utils";
import { formatNumberWithCommas } from "@ssr/common/utils/number-utils";
import { animate, useReducedMotion } from "framer-motion";
import { useEffect, useRef, useState } from "react";

type CountUpProps = {
  /** Target value to animate to. Animates from zero on mount and glides between changes. */
  value: number;
  /** Animation duration in milliseconds. */
  duration?: number;
  /** Formats the animated number; defaults to comma-separated grouping. */
  format?: (value: number) => string;
  className?: string;
};

/**
 * Animated counter that counts up to `value` with an ease-out curve, starting
 * from zero when it mounts and gliding smoothly whenever the value changes.
 * Renders the target immediately when reduced motion is requested.
 */
function CountUp({ value, duration = 1000, format = formatNumberWithCommas, className }: CountUpProps) {
  const shouldReduceMotion = useReducedMotion();
  const [displayed, setDisplayed] = useState(0);
  const fromRef = useRef(0);

  useEffect(() => {
    if (shouldReduceMotion) {
      return;
    }

    const from = fromRef.current;
    if (from === value) {
      return;
    }

    const controls = animate(from, value, {
      duration: duration / 1000,
      ease: "easeOut",
      onUpdate: current => {
        fromRef.current = current;
        setDisplayed(current);
      },
    });
    return () => controls.stop();
  }, [value, shouldReduceMotion, duration]);

  const rendered = shouldReduceMotion ? value : displayed;

  return <span className={cn("tabular-nums", className)}>{format(Math.round(rendered))}</span>;
}

export { CountUp };
