"use client";

import { ScoreReplayButton } from "@/components/score/button/score-replay-button";
import ScoreSongInfo from "@/components/score/score-song-info";
import { SparklesIcon } from "@heroicons/react/24/solid";
import type { EnrichedAccSaberScore } from "@ssr/common/schemas/accsaber/tokens/score/score";
import { env } from "@ssr/common/env";
import { getS3BucketName, StorageBucket } from "@ssr/common/minio-buckets";
import { MapDifficulty } from "@ssr/common/score/map-difficulty";
import { AccSaberBadges } from "./accsaber-badges";
import { AccSaberRankTime } from "./accsaber-rank-time";

type AccSaberScoreProps = {
  score: EnrichedAccSaberScore;
};

export default function AccSaberScoreComponent({ score }: AccSaberScoreProps) {
  return (
    <div className={`relative`}>
      <div
        className={
          "grid w-full grid-cols-[20px_1fr_1fr] gap-2 py-2 lg:grid-cols-[0.5fr_4fr_1fr_350px] lg:gap-0"
        }
      >
        <AccSaberRankTime score={score} />
        <div className="flex min-w-0 items-center overflow-hidden">
          <ScoreSongInfo
            song={{
              name: score.leaderboard.song.name,
              authorName: score.leaderboard.song.author,
              art: `${env.NEXT_PUBLIC_CDN_URL}/${getS3BucketName(StorageBucket.LeaderboardSongArt)}/${score.leaderboard.song.hash.toUpperCase()}.png`,
            }}
            level={{
              authorName: score.leaderboard.song.mapper,
              difficulty: score.leaderboard.diffInfo.diff as MapDifficulty,
            }}
            metric={{
              value: score.leaderboard.complexity,
              icon: SparklesIcon,
            }}
          />
        </div>
        <div className="flex items-center justify-end gap-(--spacing-md) px-(--spacing-md)">
          <ScoreReplayButton score={score} />
        </div>
        <AccSaberBadges score={score} />
      </div>
    </div>
  );
}
