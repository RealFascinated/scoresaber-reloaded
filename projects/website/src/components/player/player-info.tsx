import { Avatar, AvatarImage } from "@/components/ui/avatar";
import CountryFlag from "@/components/country-flag";
import Link from "next/link";
import ScoreSaberPlayerToken from "@ssr/common/types/token/scoresaber/score-saber-player-token";
import ScoreSaberLeaderboardPlayerInfoToken from "@ssr/common/types/token/scoresaber/score-saber-leaderboard-player-info-token";
import { getScoreSaberRole } from "@ssr/common/scoresaber.util";

type TablePlayerProps = {
  /**
   * The player to display.
   */
  player: ScoreSaberPlayerToken | ScoreSaberLeaderboardPlayerInfoToken;

  /**
   * The claimed player.
   */
  claimedPlayer?: ScoreSaberPlayerToken;

  /**
   * Hide the country flag
   */
  hideCountryFlag?: boolean;
};

export function PlayerInfo({ player, claimedPlayer, hideCountryFlag }: TablePlayerProps) {
  return (
    <>
      <Avatar className="w-[24px] h-[24px] pointer-events-none">
        <AvatarImage
          alt="Profile Picture"
          src={`https://img.fascinated.cc/upload/w_128,h_128/${player.profilePicture}`}
        />
      </Avatar>
      {!hideCountryFlag && <CountryFlag code={player.country} size={12} />}
      <Link className="transform-gpu transition-all hover:text-blue-500" href={`/player/${player.id}`}>
        <p
          className={player.id == claimedPlayer?.id ? "font-bold" : ""}
          style={{
            color: getScoreSaberRole(player)?.color,
          }}
        >
          {player.name}
        </p>
      </Link>
    </>
  );
}
