"use client";

import { AnimatePresence, m, useReducedMotion } from "framer-motion";
import { ReactNode, useEffect, useRef, useState } from "react";
import { usePageTransition } from "../../contexts/page-transition-context";

const containerVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 20 : -20,
    opacity: 0,
    filter: "blur(8px)",
  }),
  center: {
    x: 0,
    opacity: 1,
    filter: "blur(0px)",
  },
  exit: (direction: number) => ({
    x: direction < 0 ? 20 : -20,
    opacity: 0,
    filter: "blur(8px)",
  }),
};

const itemVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 20 : -20,
    opacity: 0,
    filter: "blur(8px)",
  }),
  center: {
    x: 0,
    opacity: 1,
    filter: "blur(0px)",
  },
  exit: (direction: number) => ({
    x: direction < 0 ? 20 : -20,
    opacity: 0,
    filter: "blur(8px)",
  }),
};

export default function PageTransition({ children, className }: { children: ReactNode; className?: string }) {
  const { currentPage, direction, isLoading } = usePageTransition();
  const shouldReduceMotion = useReducedMotion();
  const [stablePage, setStablePage] = useState(currentPage);
  const [stableChildren, setStableChildren] = useState<ReactNode>(children);
  const prevIsLoadingRef = useRef(isLoading);
  const prevRenderedPageRef = useRef(currentPage);
  const prevRenderedChildrenRef = useRef<ReactNode>(children);
  const transitionDuration = shouldReduceMotion ? 0 : 0.2;
  const filterDuration = shouldReduceMotion ? 0 : 0.15;

  // Keep track of what was last rendered while not loading.
  // This lets us freeze the outgoing view if loading starts in the same update as a page change.
  useEffect(() => {
    if (!isLoading) {
      prevRenderedPageRef.current = currentPage;
      prevRenderedChildrenRef.current = children;
    }
  }, [isLoading, currentPage, children]);

  // Capture the previous rendered page/children when loading starts.
  useEffect(() => {
    if (isLoading && !prevIsLoadingRef.current) {
      setStablePage(prevRenderedPageRef.current);
      setStableChildren(prevRenderedChildrenRef.current);
    }
    prevIsLoadingRef.current = isLoading;
  }, [isLoading]);

  const transitionKey = isLoading ? stablePage : currentPage;
  const displayChildren = isLoading ? stableChildren : children;

  return (
    <AnimatePresence mode="wait">
      <m.div
        key={transitionKey}
        className={className}
        custom={direction}
        variants={containerVariants}
        initial="enter"
        animate="center"
        exit="exit"
        transition={{
          type: "tween",
          duration: transitionDuration,
          ease: [0.4, 0, 0.2, 1],
          filter: { duration: filterDuration },
        }}
      >
        {Array.isArray(displayChildren) ? (
          displayChildren.map((child, index) => (
            <m.div
              key={`${transitionKey}-${index}`}
              custom={direction}
              variants={itemVariants}
              transition={{
                type: "tween",
                duration: transitionDuration,
                ease: [0.4, 0, 0.2, 1],
                delay: shouldReduceMotion ? 0 : index * 0.025,
                filter: { duration: filterDuration },
              }}
            >
              {child}
            </m.div>
          ))
        ) : (
          <m.div
            custom={direction}
            variants={itemVariants}
            transition={{
              type: "tween",
              duration: transitionDuration,
              ease: [0.4, 0, 0.2, 1],
              filter: { duration: filterDuration },
            }}
          >
            {displayChildren}
          </m.div>
        )}
      </m.div>
    </AnimatePresence>
  );
}
