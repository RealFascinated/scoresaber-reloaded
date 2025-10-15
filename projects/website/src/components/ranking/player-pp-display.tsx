import { cn } from "@/common/utils";
import ScoreSaberPlayer from "@ssr/common/player/impl/scoresaber-player";
import { formatPp } from "@ssr/common/utils/number-utils";
import { formatChange } from "@ssr/common/utils/utils";

type PlayerPpDisplayProps = {
  pp: number;
  mainPlayer?: ScoreSaberPlayer;
  relativePerformancePoints: boolean;
  className?: string;
};

export function PlayerPpDisplay({
  pp,
  mainPlayer,
  relativePerformancePoints,
  className,
}: PlayerPpDisplayProps) {
  const ppDifference = mainPlayer ? pp - mainPlayer.pp : 0;

  return (
    <div className={cn("flex items-center flex-col", className)}>
      <span className="text-pp text-sm font-medium">{formatPp(pp)}pp</span>
      {relativePerformancePoints && mainPlayer && (
        <span
          className={cn(
            ppDifference >= 0 ? ppDifference !== 0 && "text-green-500" : "text-red-500"
          )}
        >
          {formatChange(ppDifference, (num: number) => {
            return formatPp(num) + "pp";
          })}
        </span>
      )}
    </div>
  );
}
