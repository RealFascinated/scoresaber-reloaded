"use client";

import ScoreSongInfo from "@/components/score/score-song-info";
import { SparklesIcon } from "@heroicons/react/24/solid";
import { AccSaberScore } from "@ssr/common/api-service/impl/accsaber";
import { MapDifficulty } from "@ssr/common/score/map-difficulty";
import { AccSaberBadges } from "./accsaber-badges";
import { AccSaberRankTime } from "./accsaber-rank-time";

type AccSaberScoreProps = {
  score: AccSaberScore;
};

export default function AccSaberScoreComponent({ score }: AccSaberScoreProps) {
  return (
    <div className={`relative`}>
      <div className={`grid-cols-[20px 1fr_1fr] grid w-full gap-2 py-2 lg:grid-cols-[0.5fr_4fr_350px] lg:gap-0`}>
        <AccSaberRankTime score={score} />
        <ScoreSongInfo
          song={{
            name: score.leaderboard.song.name,
            authorName: score.leaderboard.song.author,
            art: `https://cdn.scoresaber.com/covers/${score.leaderboard.song.hash.toUpperCase()}.png`,
          }}
          level={{
            authorName: score.leaderboard.song.mapper,
            difficulty: score.leaderboard.diffInfo.diff as MapDifficulty,
          }}
          worth={{
            value: score.leaderboard.complexity,
            icon: SparklesIcon,
          }}
        />
        <AccSaberBadges score={score} />
      </div>
    </div>
  );
}
