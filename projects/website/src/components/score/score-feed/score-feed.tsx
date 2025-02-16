"use client";

import Avatar from "@/components/avatar";
import Score from "@/components/score/score";
import {
  getScoreSaberLeaderboardFromToken,
  getScoreSaberScoreFromToken,
} from "@ssr/common/token-creators";
import ScoreSaberPlayerScoreToken from "@ssr/common/types/token/scoresaber/player-score";
import { ScoreSaberWebsocketMessageToken } from "@ssr/common/types/token/scoresaber/websocket/websocket-message";
import { parseDate } from "@ssr/common/utils/time-utils";
import Link from "next/link";
import { useEffect, useState } from "react";
import useWebSocket, { ReadyState } from "react-use-websocket";

export default function ScoreFeed() {
  const { readyState, lastJsonMessage } =
    useWebSocket<ScoreSaberWebsocketMessageToken>("wss://scoresaber.com/ws");
  const [scores, setScores] = useState<ScoreSaberPlayerScoreToken[]>([]);

  useEffect(() => {
    if (!lastJsonMessage) {
      return;
    }
    const { commandName, commandData } = lastJsonMessage;
    if (commandName !== "score") {
      return;
    }

    setScores(prev => {
      return [...prev, commandData]
        .sort((a, b) => parseDate(b.score.timeSet).getTime() - parseDate(a.score.timeSet).getTime())
        .slice(0, 8);
    });
  }, [lastJsonMessage]);

  if (readyState == ReadyState.CONNECTING) {
    return <p>Not Connected to the ScoreSaber Websocket :(</p>;
  }

  if (scores.length == 0) {
    return <p>Waiting for scores...</p>;
  }

  return (
    <div className="flex flex-col divide-y divide-border">
      {scores.map(scoreToken => {
        if (!scoreToken.leaderboard || !scoreToken.score) {
          console.error("Invalid leaderboard or score data:", scoreToken);
          return null;
        }

        const player = scoreToken.score.leaderboardPlayerInfo;
        const leaderboard = getScoreSaberLeaderboardFromToken(scoreToken.leaderboard);
        const score = getScoreSaberScoreFromToken(scoreToken.score, leaderboard);

        return (
          <div key={score.scoreId} className="flex flex-col py-2">
            <div className="flex flex-row gap-2 items-center">
              <Avatar
                src={player.profilePicture!}
                className="w-6 h-6"
                alt={`${player.name}'s Profile Picture`}
              />
              <Link prefetch={false} href={`/player/${player.id}`}>
                <span className="text-ssr hover:brightness-[66%] transition-all transform-gpu">
                  {player.name}
                </span>
              </Link>
              <p className="text-gray-400 text-xs">
                {" "}
                on {scoreToken.score.deviceHmd || "Unknown Device"}
              </p>
            </div>
            <Score
              key={score.scoreId}
              score={score}
              leaderboard={leaderboard}
              settings={{
                noScoreButtons: true,
              }}
            />
          </div>
        );
      })}
    </div>
  );
}
