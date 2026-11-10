import { cn } from "@/common/utils";

export type PpSource = "SS" | "BL";

type PpValueProps = {
  pp: number;
  source: PpSource;
  /** Whether to show which leaderboard the pp is from. */
  showPlatform?: boolean;
  /** Dims the value, like the paused accuracy. */
  dimmed?: boolean;
};

/** A pp value with the leaderboard it is from. */
export function PpValue({ pp, source, showPlatform = true, dimmed = false }: PpValueProps) {
  return (
    <p className={cn("text-4xl font-bold whitespace-nowrap tabular-nums", dimmed && "opacity-60")}>
      {pp.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      <span className="text-muted-foreground ml-1 text-2xl font-medium">
        PP{showPlatform && <span className="ml-1 text-xl">{source}</span>}
      </span>
    </p>
  );
}
