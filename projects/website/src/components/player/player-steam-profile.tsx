import Tooltip from "@/components/tooltip";
import ScoreSaberPlayer from "@ssr/common/player/impl/scoresaber-player";
import Link from "next/link";
import SteamLogo from "@/components/logos/logos/steam-logo";

type Props = {
  player: ScoreSaberPlayer;
};

export default function PlayerSteamProfile({ player }: Props) {
  return (
    <div className="flex gap-2">
      <Tooltip display={<p>Click to view the Steam Profile for {player.name}</p>} side="bottom">
        <Link href={`https://steamcommunity.com/profiles/${player.id}`} target="_blank" className="cursor-pointer">
          <SteamLogo size={19} />
        </Link>
      </Tooltip>
    </div>
  );
}
