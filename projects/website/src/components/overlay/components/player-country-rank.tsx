import { DailyChange } from "@/components/statistic/daily-change";
import CountryFlag from "@/components/ui/country-flag";
import ScoreSaberPlayer from "@ssr/common/player/impl/scoresaber-player";
import { PlayerStatChange } from "@ssr/common/player/player-stat-change";
import { formatNumberWithCommas } from "@ssr/common/utils/number-utils";

type OverlayPlayerRankProps = {
  /**
   * The player to display information for.
   */
  player: ScoreSaberPlayer;
};
export default function OverlayPlayerCountryRank({ player }: OverlayPlayerRankProps) {
  const { countryRank, country } = player;

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-2">
        <CountryFlag code={country} size={18} />
        <p>#{formatNumberWithCommas(countryRank)}</p>
      </div>
      <DailyChange
        type={PlayerStatChange.CountryRank}
        change={player.statisticChange?.daily?.countryRank ?? 0}
        className="text-md"
        useTooltip={false}
      />
    </div>
  );
}
