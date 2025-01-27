import ScoreSaberPlayer from "@ssr/common/player/impl/scoresaber-player";
import Image from "next/image";
import { formatPp } from "@ssr/common/utils/number-utils";
import OverlayPlayerCountryRank from "@/components/overlay/components/player-country-rank";
import OverlayPlayerRank from "../components/player-rank";

type OverlayPlayerInfoProps = {
  /**
   * The player to display information for.
   */
  player: ScoreSaberPlayer;
};

export default function OverlayPlayerInfoView({ player }: OverlayPlayerInfoProps) {
  return (
    <div className="flex gap-2 text-2xl">
      <Image
        src={player.avatar}
        alt={`${player.name}'s profile picture`}
        className="rounded-md"
        width={192}
        height={192}
        unoptimized
      />
      <div>
        <p className="text-3xl font-semibold">{player.name}</p>
        <p className="text-ssr">{formatPp(player.pp)}pp</p>
        <OverlayPlayerRank rank={player.rank} />
        <OverlayPlayerCountryRank countryRank={player.countryRank} country={player.country} />
      </div>
    </div>
  );
}
