"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ReactNode } from "react";
import { usePageTransition } from "./page-transition-context";

const containerVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? -30 : 30,
    opacity: 0,
    scale: 0.98,
  }),
  center: {
    x: 0,
    opacity: 1,
    scale: 1,
  },
  exit: (direction: number) => ({
    x: direction < 0 ? -30 : 30,
    opacity: 0,
    scale: 0.98,
  }),
};

const itemVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? -15 : 15,
    opacity: 0,
    y: 10,
  }),
  center: {
    x: 0,
    opacity: 1,
    y: 0,
  },
  exit: (direction: number) => ({
    x: direction < 0 ? -15 : 15,
    opacity: 0,
    y: -10,
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
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={currentPage}
        className={className}
        custom={direction}
        variants={containerVariants}
        initial="enter"
        animate="center"
        exit="exit"
        transition={{
          type: "spring",
          stiffness: 300,
          damping: 30,
          mass: 0.8,
          duration: 0.4,
        }}
      >
        {Array.isArray(children) ? (
          children.map((child, index) => (
            <motion.div
              key={index}
              custom={direction}
              variants={itemVariants}
              transition={{
                type: "spring",
                stiffness: 400,
                damping: 35,
                mass: 0.6,
                delay: index * 0.03,
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
              type: "spring",
              stiffness: 400,
              damping: 35,
              mass: 0.6,
            }}
          >
            {children}
          </motion.div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
