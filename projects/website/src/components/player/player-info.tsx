import { Avatar, AvatarImage } from "@/components/ui/avatar";
import CountryFlag from "@/components/country-flag";
import Link from "next/link";
import ScoreSaberPlayerToken from "@ssr/common/types/token/scoresaber/score-saber-player-token";
import ScoreSaberLeaderboardPlayerInfoToken from "@ssr/common/types/token/scoresaber/score-saber-leaderboard-player-info-token";
import { getScoreSaberRole } from "@ssr/common/scoresaber.util";
import ScoreSaberPlayer from "@ssr/common/player/impl/scoresaber-player";
import { clsx } from "clsx";

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
   * Whether to apply hover brightness
   */
  hoverBrightness?: boolean;
};

export function PlayerInfo({ player, highlightedPlayer, hideCountryFlag, hoverBrightness = true }: TablePlayerProps) {
  return (
    <div className="flex gap-2 items-center">
      <Avatar className="w-[24px] h-[24px] pointer-events-none">
        <AvatarImage
          alt="Profile Picture"
          src={`https://img.fascinated.cc/upload/w_128,h_128/${player.profilePicture}`}
        />
      </Avatar>
      {!hideCountryFlag && <CountryFlag code={player.country} size={12} />}
      <Link
        className={clsx(hoverBrightness ? "transform-gpu transition-all hover:brightness-[66%]" : "")}
        href={`/player/${player.id}`}
      >
        <p
          className={player.id == highlightedPlayer?.id ? "font-bold" : ""}
          style={{
            color: getScoreSaberRole(player)?.color,
          }}
        >
          {player.name}
        </p>
      </Link>
    </div>
  );
}
