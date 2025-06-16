"use client";

import ScoreSaberPlayer from "@ssr/common/player/impl/scoresaber-player";
import { ScoreSaberPlayerToken } from "@ssr/common/types/token/scoresaber/player";
import Link from "next/link";
import AddFriend from "../friend/add-friend";
import PlayerPreview from "../player/player-preview";
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

export function PlayerRanking({
  player,
  mainPlayer,
  relativePerformancePoints,
}: PlayerRankingProps) {
  const history = player.histories.split(",").map(Number);
  const weeklyRankChange = history[history?.length - 6] - player.rank;

  return (
    <Link href={`/player/${player.id}`}>
      <PlayerPreview
        playerId={player.id}
        className="grid grid-cols-[48px_45px_60px_32px_1fr_90px_30px] items-center w-full bg-[#232323] rounded-lg px-2 py-1 mb-1 gap-3 shadow-sm min-h-[40px] hover:bg-[#2d2d2d] transition-all cursor-pointer"
        delay={750}
        useLink={false}
      >
        {/* Rank */}
        <PlayerRankDisplay rank={player.rank} />

        {/* Weekly Rank Change */}
        <WeeklyRankChange weeklyRankChange={weeklyRankChange} showTooltip />

        {/* Country Rank + Flag */}
        <CountryRankDisplay countryRank={player.countryRank} country={player.country} />

        {/* Avatar */}
        <PlayerAvatar profilePicture={player.profilePicture} name={player.name} />

        {/* Name */}
        <PlayerName name={player.name} />

        {/* PP */}
        <PlayerPpDisplay
          pp={player.pp}
          mainPlayer={mainPlayer}
          relativePerformancePoints={relativePerformancePoints}
          className="justify-end"
        />

        {/* Add Friend */}
        <div className="size-7 flex items-center justify-center">
          <AddFriend player={player} iconOnly />
        </div>
      </PlayerPreview>
    </Link>
  );
}
