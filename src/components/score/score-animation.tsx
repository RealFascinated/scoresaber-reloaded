import { Variants } from "framer-motion";

/**
 * The animation values for the score slide in animation.
 */
export const scoreAnimation: Variants = {
  hiddenRight: { opacity: 0, x: 50 },
  hiddenLeft: { opacity: 0, x: -50 },
  visible: { opacity: 1, x: 0, transition: { staggerChildren: 0.03 } },
};
