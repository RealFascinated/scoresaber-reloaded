import ScoreSaberPlayer from "@ssr/common/player/impl/scoresaber-player";
import { ReactNode } from "react";
import Link from "next/link";
import { FaTwitch } from "react-icons/fa";
import { ssrConfig } from "../../../../config";
import Tooltip from "@/components/tooltip";
import BeatLeaderLogo from "@/components/logos/beatleader-logo";
import SteamLogo from "@/components/logos/logos/steam-logo";

type PlayerLinksProps = {
  url: string;
  name: string;
  playerName: string;
  icon: ReactNode;
};

function PlayerLink({ url, name, playerName, icon }: PlayerLinksProps) {
  return (
    <Tooltip
      className="p-2 bg-accent rounded-md"
      display={
        <p>
          View the {name} profile for {playerName}
        </p>
      }
    >
      <Link href={url} target="_blank" rel="noreferrer">
        {icon}
      </Link>
    </Tooltip>
  );
}

export default function PlayerLinks({ player }: { player: ScoreSaberPlayer }) {
  const twitchName = ssrConfig.playerTwitchAccounts[player.id];

  return (
    <div className="flex gap-2 flex-wrap justify-center items-center lg:justify-start lg:items-start">
      {twitchName && (
        <PlayerLink
          playerName={player.name}
          name="Twitch"
          url={`https://twitch.tv/${twitchName}`}
          icon={<FaTwitch className="size-[20px]" />}
        />
      )}
      <PlayerLink
        playerName={player.name}
        name="BeatLeader"
        url={`https://beatleader.xyz/u/${player.id}`}
        icon={<BeatLeaderLogo size={20} />}
      />
      <PlayerLink
        playerName={player.name}
        name="Steam"
        url={`https://steamcommunity.com/profiles/${player.id}`}
        icon={<SteamLogo size={20} />}
      />
    </div>
  );
}
