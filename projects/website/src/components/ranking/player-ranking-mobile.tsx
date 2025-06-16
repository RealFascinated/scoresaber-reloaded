import ScoreSaberPlayer from "@ssr/common/player/impl/scoresaber-player";
import { ScoreSaberPlayerToken } from "@ssr/common/types/token/scoresaber/player";
import Link from "next/link";
import AddFriend from "../friend/add-friend";
import { CountryRankDisplay } from "./country-rank-display";
import { PlayerAvatar } from "./player-avatar";
import { PlayerName } from "./player-name";
import { PlayerPpDisplay } from "./player-pp-display";
import { PlayerRankDisplay } from "./player-rank-display";
import { WeeklyRankChange } from "./weekly-rank-change";

type PlayerRankingProps = {
  player: ScoreSaberPlayerToken;
  mainPlayer?: ScoreSaberPlayer;
  relativePerformancePoints: boolean;
};

export function PlayerRankingMobile({
  player,
  mainPlayer,
  relativePerformancePoints,
}: PlayerRankingProps) {
  const history = player.histories.split(",").map(Number);
  const weeklyRankChange = history[history?.length - 6] - player.rank;

  return (
    <Link href={`/player/${player.id}`}>
      <div className="flex flex-col w-full bg-[#232323] rounded-lg px-2 py-1 mb-1 gap-1 shadow-sm min-h-[67px] justify-center hover:bg-[#2d2d2d] transition-all cursor-pointer">
        {/* Top row: Rank, Country Rank, and Weekly Change */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {/* Rank */}
            <PlayerRankDisplay rank={player.rank} className="min-w-[40px]" />

            {/* Country Rank + Flag */}
            <CountryRankDisplay
              countryRank={player.countryRank}
              country={player.country}
              className="min-w-[48px]"
              flagSize={10}
            />
          </div>

          {/* Weekly Rank Change */}
          <WeeklyRankChange weeklyRankChange={weeklyRankChange} className="min-w-[36px]" />
        </div>

        {/* Bottom row: Avatar, Name, PP, and Action Button */}
        <div className="flex items-center gap-2">
          {/* Avatar */}
          <PlayerAvatar
            profilePicture={player.profilePicture}
            name={player.name}
            className="flex items-center min-w-[28px]"
          />

          {/* Name */}
          <PlayerName
            name={player.name}
            className="flex items-center min-w-[90px] max-w-[140px] overflow-hidden flex-1"
          />

          {/* PP */}
          <PlayerPpDisplay
            pp={player.pp}
            mainPlayer={mainPlayer}
            relativePerformancePoints={relativePerformancePoints}
            className="min-w-[70px] ml-auto"
          />

          {/* Add Friend */}
          <div className="size-7 flex items-center justify-center">
            <AddFriend player={player} iconOnly />
          </div>
        </div>
      </div>
    </Link>
  );
}
