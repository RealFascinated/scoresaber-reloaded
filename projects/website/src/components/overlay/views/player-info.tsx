import OverlayView, { OverlayViewPosition } from "@/components/overlay/views/view";
import ScoreSaberPlayer from "@ssr/common/player/impl/scoresaber-player";
import Image from "next/image";
import CountryFlag from "@/components/country-flag";
import { GlobeAmericasIcon } from "@heroicons/react/24/solid";
import { formatNumberWithCommas, formatPp } from "@ssr/common/utils/number-utils";
import OverlayPlayerCountryRank from "@/components/overlay/components/player-country-rank";
import OverlayPlayerRank from "../components/player-rank";

type OverlayPlayerInfoProps = {
  /**
   * The position for this view.
   */
  position: OverlayViewPosition;

  /**
   * The player to display information for.
   */
  player: ScoreSaberPlayer;
};

export default function OverlayPlayerInfo({ position, player }: OverlayPlayerInfoProps) {
  return (
    <OverlayView position={position} className="text-2xl">
      <div className="flex gap-2">
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
    </OverlayView>
  );
}
