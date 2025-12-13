"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ReactNode, useEffect, useRef } from "react";
import { usePageTransition } from "./page-transition-context";

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

export default function PageTransition({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const { currentPage, direction, isLoading } = usePageTransition();
  const stablePageRef = useRef(currentPage);
  const stableChildrenRef = useRef<ReactNode>(children);
  const prevIsLoadingRef = useRef(isLoading);

  // Update stable refs when not loading
  if (!isLoading) {
    stablePageRef.current = currentPage;
    stableChildrenRef.current = children;
  }

  // Capture children when loading starts
  useEffect(() => {
    if (isLoading && !prevIsLoadingRef.current) {
      // Loading just started - ensure we have the current children captured
      stableChildrenRef.current = children;
      stablePageRef.current = currentPage;
    }
    prevIsLoadingRef.current = isLoading;
  }, [isLoading, currentPage, children]);

  const transitionKey = isLoading ? stablePageRef.current : currentPage;
  const displayChildren = isLoading ? stableChildrenRef.current : children;

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={transitionKey}
        className={className}
        custom={direction}
        variants={containerVariants}
        initial="enter"
        animate="center"
        exit="exit"
        transition={{
          type: "tween",
          duration: 0.2,
          ease: [0.4, 0, 0.2, 1],
          filter: { duration: 0.15 },
        }}
      >
        {Array.isArray(displayChildren) ? (
          displayChildren.map((child, index) => (
            <motion.div
              key={index}
              custom={direction}
              variants={itemVariants}
              transition={{
                type: "tween",
                duration: 0.2,
                ease: [0.4, 0, 0.2, 1],
                delay: index * 0.025,
                filter: { duration: 0.15 },
              }}
            >
              {child}
            </motion.div>
          ))
        ) : (
          <motion.div
            custom={direction}
            variants={itemVariants}
            transition={{
              type: "tween",
              duration: 0.2,
              ease: [0.4, 0, 0.2, 1],
              filter: { duration: 0.15 },
            }}
          >
            {displayChildren}
          </motion.div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
