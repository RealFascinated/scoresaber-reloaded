/**
 * Gets the text color class for a rank (gold, silver and bronze for the podium).
 */
export function getRankColor(rank: number) {
  switch (rank) {
    case 1:
      return "text-rank-gold";
    case 2:
      return "text-rank-silver";
    case 3:
      return "text-rank-bronze";
    default:
      return "text-foreground";
  }
}

/**
 * Gets the classes for a rank pill: podium ranks are tinted with their medal color, everything else
 * uses the neutral muted surface.
 */
export function getRankPillClass(rank: number) {
  switch (rank) {
    case 1:
      return "bg-rank-gold/15 text-rank-gold ring-1 ring-inset ring-rank-gold/45";
    case 2:
      return "bg-rank-silver/15 text-rank-silver ring-1 ring-inset ring-rank-silver/45";
    case 3:
      return "bg-rank-bronze/15 text-rank-bronze ring-1 ring-inset ring-rank-bronze/45";
    default:
      return "bg-muted text-foreground";
  }
}
