/**
 * Hex mirrors of the tokens in `app/styles/themes.css`, for places that can't read CSS variables
 * (Chart.js draws to a canvas, and the viewport theme color is a meta tag).
 *
 * Keep these in sync with the OKLCH values in themes.css. Colors that change with the color theme are
 * kept as `var(--token)` instead; charts resolve those with `useCanvasColors`.
 */
export const Colors = {
  secondary: "#0b0c0f", // --background
  pp: "var(--pp)",
  rankedLight: "#59c5f5", // --info
  medal: "#f0a556", // --medals
  hands: {
    left: "#fa6863", // --hands-left
    right: "#4dacf6", // --hands-right
  },
  generic: {
    green: "#56d57b", // --success
  },
  status: {
    success: "#56d57b", // --success
    danger: "#ff6367", // --danger
    warning: "#fac131", // --warning
    info: "#59c5f5", // --info
  },
  rank: {
    global: "#56d57b", // --success
    country: "#fac131", // --warning
  },
  /** Accuracy tiers, the same "rarity" ramp as the accuracy badges. */
  accuracy: {
    none: "#9b9ea6", // --acc-none
    a: "#6ed889", // --acc-a
    s: "#67caff", // --acc-s
    sPlus: "#8fabff", // --acc-s-plus
    ss: "#ca92ff", // --acc-ss
    ssPlus: "#ff85c7", // --acc-ss-plus
    god: "#f7c747", // --acc-god
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
