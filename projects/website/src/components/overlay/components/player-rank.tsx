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
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-3">
        <div className="flex w-6 justify-center">
          <GlobeAmericasIcon className="h-6 w-6 text-slate-300" />
        </div>
        <p className={cn(getRankColor(rank), "text-2xl font-bold")}>
          #{formatNumberWithCommas(rank)}
        </p>
      </div>
      <DailyChange
        type={PlayerStatChange.Rank}
        change={player.statisticChange?.daily?.rank ?? 0}
        className="text-lg"
        useTooltip={false}
      />
    </div>
  );
}
