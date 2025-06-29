import { getRankColor } from "@/common/rank-color-utils";
import { cn } from "@/common/utils";
import { DailyChange } from "@/components/statistic/daily-change";
import { GlobeAmericasIcon } from "@heroicons/react/24/solid";
import ScoreSaberPlayer from "@ssr/common/player/impl/scoresaber-player";
import { PlayerStatChange } from "@ssr/common/player/player-stat-change";
import { formatNumberWithCommas } from "@ssr/common/utils/number-utils";

type OverlayPlayerRankProps = {
  /**
   * The player to display information for.
   */
  player: ScoreSaberPlayer;
};

export default function OverlayPlayerRank({ player }: OverlayPlayerRankProps) {
  const rank = player.rank;

  return (
    <div className="flex min-h-[24px] items-center gap-3">
      <div className="flex h-6 items-center gap-2">
        <div className="flex w-[40px] items-center justify-center">
          <GlobeAmericasIcon className="h-6 w-6" />
        </div>
        <div className="h-full w-[1px] bg-white" />
        <p className={cn(getRankColor(rank), "font-semibold")}>#{formatNumberWithCommas(rank)}</p>
      </div>
      <DailyChange
        type={PlayerStatChange.Rank}
        change={player.statisticChange?.daily?.rank ?? 0}
        className="text-sm"
        useTooltip={false}
      />
    </div>
  );
}
