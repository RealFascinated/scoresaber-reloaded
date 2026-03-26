"use client";

import Avatar from "@/components/avatar";
import ScoreSaberScoreDisplay from "@/components/platform/scoresaber/score/scoresaber-score";
import SimpleLink from "@/components/simple-link";
import { env } from "@ssr/common/env";
import Logger from "@ssr/common/logger";
import { PlayerScore } from "@ssr/common/score/player-score";
import { parseDate } from "@ssr/common/utils/time-utils";
import { useEffect, useState } from "react";
import useWebSocket, { ReadyState } from "react-use-websocket";

export default function ScoreFeed() {
  const { readyState, lastJsonMessage } = useWebSocket<PlayerScore>(
    `${env.NEXT_PUBLIC_WEBSOCKET_URL}/ws/score`
  );
  const [scores, setScores] = useState<PlayerScore[]>([]);

  useEffect(() => {
    if (!lastJsonMessage) {
      return;
    }

    queueMicrotask(() => {
      setScores(prev => {
        return [...prev, lastJsonMessage]
          .sort(
            (a, b) =>
              parseDate(b.score.timestamp.toString()).getTime() -
              parseDate(a.score.timestamp.toString()).getTime()
          )
          .slice(0, 8);
      });
    });
  }, [lastJsonMessage]);

  if (readyState == ReadyState.CONNECTING) {
    return <p>Not Connected to the ScoreSaber Websocket :(</p>;
  }

  if (scores.length == 0) {
    return <p>Waiting for scores...</p>;
  }

  return (
    <div className="divide-border flex w-full flex-col divide-y">
      {scores.map(scoreToken => {
        if (!scoreToken.leaderboard || !scoreToken.score) {
          Logger.error("Invalid leaderboard or score data:", scoreToken);
          return null;
        }

        const player = scoreToken.score.playerInfo;
        const score = scoreToken.score;
        const leaderboard = scoreToken.leaderboard;

        return (
          <div key={score.scoreId} className="cv-score-card flex w-full flex-col py-2 first:py-0 last:pb-0">
            <div className="flex flex-row items-center gap-2">
              <Avatar
                src={player.profilePicture!}
                className="h-6 w-6"
                alt={`${player.name}'s Profile Picture`}
              />
              <SimpleLink href={`/player/${player.id}`}>
                <span className="text-primary hover:text-primary/80 transition-all">{player.name}</span>
              </SimpleLink>
              <p className="text-xs text-gray-400">on {scoreToken.score.hmd || "Unknown Device"}</p>
            </div>
            <ScoreSaberScoreDisplay
              key={score.scoreId}
              score={score}
              leaderboard={leaderboard}
              settings={{
                noScoreButtons: true,
                hideDetailsDropdown: true,
              }}
            />
          </div>
        );
      })}
    </div>
  );
}
