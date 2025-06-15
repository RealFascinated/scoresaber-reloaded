import BeatLeaderLogo from "@/components/logos/beatleader-logo";
import SteamLogo from "@/components/logos/logos/steam-logo";
import SimpleTooltip from "@/components/simple-tooltip";
import { Dialog, DialogTrigger } from "@/components/ui/dialog";
import ScoreSaberPlayer from "@ssr/common/player/impl/scoresaber-player";
import { ssrConfig } from "config";
import Link from "next/link";
import { ReactNode } from "react";
import { FaTwitch } from "react-icons/fa";
import PlayerActionButtonWrapper from "../buttons/player-action-button-wrapper";
import PlayerScoreChartButton from "../buttons/player-score-chart-button";
import SnipePlaylistCreator from "../snipe/player-snipe-playlist-creator";

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
      <Link href={url} target="_blank" rel="noreferrer">
        {tooltipContent}
      </Link>
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
      {/* Social Links */}
      {twitchName && (
        <PlayerLink
          playerName={player.name}
          name="Twitch"
          url={`https://twitch.tv/${twitchName}`}
          icon={<FaTwitch className="size-[20px] select-none" />}
        />
      )}
      <PlayerLink
        playerName={player.name}
        name="BeatLeader"
        url={`https://beatleader.xyz/u/${player.id}`}
        icon={<BeatLeaderLogo size={20} className="select-none" />}
      />
      <PlayerLink
        playerName={player.name}
        name="Steam"
        url={`https://steamcommunity.com/profiles/${player.id}`}
        icon={<SteamLogo size={20} className="select-none" />}
      />

      {/* Divider */}
      <div className="flex items-center">
        <div className="h-7 w-[1px] bg-border" />
      </div>

      {/* Actions */}
      <>
        <PlayerScoreChartButton player={player} />
        <SnipePlaylistCreator toSnipe={player} />
      </>
    </div>
  );
}
