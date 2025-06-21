"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ReactNode } from "react";
import { usePageTransition } from "./page-transition-context";

const containerVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? -20 : 20,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (direction: number) => ({
    x: direction < 0 ? -20 : 20,
    opacity: 0,
  }),
};

const itemVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? -20 : 20,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (direction: number) => ({
    x: direction < 0 ? -20 : 20,
    opacity: 0,
  }),
};

export default function PageTransition({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const { currentPage, direction } = usePageTransition();

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={currentPage}
        className={className}
        custom={direction}
        variants={containerVariants}
        initial="enter"
        animate="center"
        exit="exit"
        transition={{
          type: "tween",
          duration: 0.15,
          ease: "easeOut",
        }}
      >
        {Array.isArray(children) ? (
          children.map((child, index) => (
            <motion.div
              key={index}
              custom={direction}
              variants={itemVariants}
              transition={{
                type: "tween",
                duration: 0.15,
                ease: "easeOut",
                delay: index * 0.008,
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
              duration: 0.15,
              ease: "easeOut",
            }}
          >
            {children}
          </motion.div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
