"use client";

import { ScoreReplayButton } from "@/components/score/button/score-replay-button";
import ScoreSongInfo from "@/components/score/score-song-info";
import { SharedIcons } from "@/shared-icons";
import { AccSaberScore } from "@ssr/common/schemas/accsaber/tokens/score/score";
import { MapDifficulty } from "@ssr/common/schemas/map/map-difficulty";
import { getScoreSaberLeaderboardCoverUrl } from "@ssr/common/utils/scoresaber.util";
import { AccSaberBadges } from "./accsaber-badges";
import { AccSaberRankTime } from "./accsaber-rank-time";

type AccSaberScoreProps = {
  score: AccSaberScore;
};

export default function AccSaberScoreComponent({ score }: AccSaberScoreProps) {
  return (
    <div className={`relative`}>
      <div
        className={
          "grid-cols-[20px 1fr_1fr] grid w-full gap-2 py-2 lg:grid-cols-[0.5fr_4fr_1fr_350px] lg:gap-0"
        }
      >
        <AccSaberRankTime score={score} />
        <div className="flex min-w-0 items-center">
          <ScoreSongInfo
            song={{
              name: score.leaderboard.song.name,
              authorName: score.leaderboard.song.author,
              art: getScoreSaberLeaderboardCoverUrl(score.leaderboard.song.hash),
            }}
            level={{
              authorName: score.leaderboard.song.mapper,
              difficulty: score.leaderboard.diffInfo.diff as MapDifficulty,
            }}
            metric={{
              value: score.leaderboard.complexity,
              icon: SharedIcons.AccSaberBadgeIcon,
            }}
          />
        </div>
        <div className="flex items-center justify-end gap-(--spacing-md) px-(--spacing-md)">
          <ScoreReplayButton score={score.beatLeaderScore} />
        </div>
        <AccSaberBadges score={score} />
      </div>
    </div>
  );
}
