import { Avatar, AvatarImage } from "@/components/ui/avatar";
import CountryFlag from "@/components/country-flag";
import Link from "next/link";
import ScoreSaberPlayerToken from "@ssr/common/types/token/scoresaber/score-saber-player-token";
import ScoreSaberLeaderboardPlayerInfoToken from "@ssr/common/types/token/scoresaber/score-saber-leaderboard-player-info-token";
import ScoreSaberPlayer from "@ssr/common/player/impl/scoresaber-player";
import { clsx } from "clsx";
import { getScoreSaberRole } from "@ssr/common/utils/scoresaber.util";

type TablePlayerProps = {
  /**
   * The player to display.
   */
  player: ScoreSaberPlayerToken | ScoreSaberLeaderboardPlayerInfoToken;

  /**
   * The player to highlight.
   */
  highlightedPlayer?: ScoreSaberPlayerToken | ScoreSaberPlayer;

  /**
   * Hide the country flag
   */
  hideCountryFlag?: boolean;

  /**
   * Whether to make the player name a link
   */
  useLink?: boolean;

  /**
   * Whether to apply hover brightness
   */
  hoverBrightness?: boolean;
};

export function PlayerInfo({
  player,
  highlightedPlayer,
  hideCountryFlag,
  useLink,
  hoverBrightness = true,
}: TablePlayerProps) {
  const name = (
    <p
      className={clsx(
        hoverBrightness ? "transform-gpu transition-all hover:brightness-[66%]" : "",
        player.id == highlightedPlayer?.id ? "font-bold" : "",
        "text-ellipsis overflow-hidden whitespace-nowrap"
      )}
      style={{
        color: getScoreSaberRole(player)?.color,
      }}
    >
      {player.name}
    </p>
  );

  return (
    <div className="flex gap-2 items-center w-[175px]">
      <Avatar className="w-[24px] h-[24px] pointer-events-none">
        <AvatarImage
          alt="Profile Picture"
          src={`https://img.fascinated.cc/upload/w_128,h_128/${player.profilePicture}`}
        />
      </Avatar>
      {!hideCountryFlag && <CountryFlag code={player.country} size={12} />}
      {useLink ? <Link href={`/player/${player.id}`}>{name}</Link> : name}
    </div>
  );
}
