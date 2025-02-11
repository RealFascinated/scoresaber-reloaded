import CountryFlag from "@/components/country-flag";
import Link from "next/link";
import ScoreSaberPlayer from "@ssr/common/player/impl/scoresaber-player";
import { clsx } from "clsx";
import { getScoreSaberAvatar, getScoreSaberRoles } from "@ssr/common/utils/scoresaber.util";
import { ScoreSaberLeaderboardPlayerInfoToken } from "@ssr/common/types/token/scoresaber/leaderboard-player-info";
import ScoreSaberPlayerToken from "@ssr/common/types/token/scoresaber/player";
import Avatar from "@/components/avatar";

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
   * The additional class names
   */
  className?: string;

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
  className,
  hideCountryFlag,
  useLink,
  hoverBrightness = true,
}: TablePlayerProps) {
  const name = (
    <p
      className={clsx(
        hoverBrightness ? "transform-gpu transition-all hover:brightness-[66%]" : "",
        player.id == highlightedPlayer?.id ? "font-bold" : "",
        `text-ellipsis max-w-[250px] overflow-hidden whitespace-nowrap break-all`,
        className
      )}
      style={{
        color: getScoreSaberRoles(player)[0]?.color,
      }}
    >
      {player.name}
    </p>
  );

  return (
    <div className="flex gap-2 items-center">
      <Avatar
        src={player.profilePicture ?? getScoreSaberAvatar(player)}
        className="w-[24px] h-[24px] pointer-events-none"
        alt={`${player.name}'s Profile Picture`}
      />
      {!hideCountryFlag && <CountryFlag code={player.country!} size={12} />}
      {useLink ? (
        <Link prefetch={false} href={`/player/${player.id}`}>
          {name}
        </Link>
      ) : (
        name
      )}
    </div>
  );
}
