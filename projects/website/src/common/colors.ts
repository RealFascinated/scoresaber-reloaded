/**
 * Hex mirrors of the tokens in `app/styles/themes.css`, for places that can't read CSS variables
 * (Chart.js draws to a canvas, and the viewport theme color is a meta tag).
 *
 * Keep these in sync with the OKLCH values in themes.css. Colors that change with the color theme are
 * kept as `var(--token)` instead; charts resolve those with `useCanvasColors`.
 */
export const Colors = {
  secondary: "#0b0c0f",
  pp: "var(--pp)",
  rankedLight: "#59c5f5",
  medal: "#f0a556",
  hands: {
    left: "#fa6863",
    right: "#4dacf6",
  },
  generic: {
    green: "#56d57b",
  },
  status: {
    success: "#56d57b",
    danger: "#ff6367",
    warning: "#fac131",
    info: "#59c5f5",
  },
  rank: {
    global: "#56d57b",
    country: "#fac131",
  },
  /** Accuracy tiers, the same "rarity" ramp as the accuracy badges. */
  accuracy: {
    none: "#9b9ea6",
    a: "#6ed889",
    s: "#67caff",
    sPlus: "#8fabff",
    ss: "#ca92ff",
    ssPlus: "#ff85c7",
    god: "#f7c747",
  },
  /** Bar/series colors for score-count charts. */
  series: {
    ranked: "#ae6dee",
    rankedImproved: "#f05560",
    unranked: "#6b6f78",
    unrankedImproved: "#3d4048",
    total: "#e57600",
    totalRanked: "#59c5f5",
  },
};
