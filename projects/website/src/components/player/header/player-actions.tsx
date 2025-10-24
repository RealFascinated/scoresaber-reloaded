import BeatLeaderLogo from "@/components/logos/beatleader-logo";
import SteamLogo from "@/components/logos/logos/steam-logo";
import SimpleLink from "@/components/simple-link";
import SimpleTooltip from "@/components/simple-tooltip";
import { Dialog, DialogTrigger } from "@/components/ui/dialog";
import ScoreSaberPlayer from "@ssr/common/player/impl/scoresaber-player";
import { ssrConfig } from "config";
import dynamic from "next/dynamic";
import { ReactNode } from "react";
import { FaTwitch } from "react-icons/fa";
import PlayerActionButtonWrapper from "../buttons/player-action-button-wrapper";
import SnipePlaylistCreator from "../snipe/player-snipe-playlist-creator";
import ScoresaberLogo from "@/components/logos/logos/scoresaber-logo";

const PlayerRankingMini = dynamic(() => import("../mini-ranking/player-mini-ranking"), {
  ssr: false,
});

type PlayerLinkProps = {
  url?: string;
  name: string;
  playerName: string;
  icon: ReactNode;
  children?: ReactNode;
};

export function PlayerLink({ url, name, playerName, icon, children }: PlayerLinkProps) {
  const tooltipContent = (
    <SimpleTooltip
      display={
        <p>
          View the <b>{name}</b> profile for <b>{playerName}</b>
        </p>
      }
    >
      <PlayerActionButtonWrapper>{icon}</PlayerActionButtonWrapper>
    </SimpleTooltip>
  );

  if (url) {
    return (
      <SimpleLink href={url} target="_blank" rel="noreferrer">
        {tooltipContent}
      </SimpleLink>
    );
  }

  if (children) {
    return (
      <Dialog>
        <DialogTrigger asChild>{tooltipContent}</DialogTrigger>
        {children}
      </Dialog>
    );
  }

  return tooltipContent;
}

export default function PlayerActions({ player }: { player: ScoreSaberPlayer }) {
  const twitchName = ssrConfig.playerTwitchAccounts[player.id];

  return (
    <div className="flex gap-2">
      {/* ScoreSaber Profile */}
      <PlayerLink
        playerName={player.name}
        name="ScoreSaber"
        url={`https://scoresaber.com/u/${player.id}`}
        icon={<ScoresaberLogo size={20} className="select-none" />}
        data-umami-event="player-scoresaber-button"
      />

      {/* Social Links */}
      {twitchName && (
        <PlayerLink
          playerName={player.name}
          name="Twitch"
          url={`https://twitch.tv/${twitchName}`}
          icon={<FaTwitch className="size-[20px] select-none" />}
          data-umami-event="player-twitch-button"
        />
      )}
      <PlayerLink
        playerName={player.name}
        name="BeatLeader"
        url={`https://beatleader.xyz/u/${player.id}`}
        icon={<BeatLeaderLogo size={20} className="select-none" />}
        data-umami-event="player-beatleader-button"
      />
      <PlayerLink
        playerName={player.name}
        name="Steam"
        url={`https://steamcommunity.com/profiles/${player.id}`}
        icon={<SteamLogo size={20} className="select-none" />}
        data-umami-event="player-steam-button"
      />

      {/* Divider */}
      <div className="flex items-center">
        <div className="bg-border h-7 w-[1px]" />
      </div>

      {/* Actions */}
      <>
        <SnipePlaylistCreator toSnipe={player} />
      </>
    </div>
  );
}
