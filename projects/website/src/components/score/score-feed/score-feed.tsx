"use client";

import { useEffect, useState } from "react";
import ScoreSaberPlayerScoreToken from "@ssr/common/types/token/scoresaber/score-saber-player-score-token";
import Score from "@/components/score/score";
import { parseDate } from "@ssr/common/utils/time-utils";
import Link from "next/link";
import { useWebSocket } from "@/hooks/use-websocket";
import { ScoreSaberWebsocketMessageToken } from "@ssr/common/types/token/scoresaber/websocket/scoresaber-websocket-message";

export default function ScoreFeed() {
  const { connected, message } = useWebSocket<ScoreSaberWebsocketMessageToken>("wss://scoresaber.com/ws");
  const [scores, setScores] = useState<ScoreSaberPlayerScoreToken[]>([]);

  useEffect(() => {
    if (!message) {
      return;
    }
    const { commandName, commandData } = message;
    if (commandName !== "score") {
      return;
    }

    setScores(prev => {
      const newScores = [...prev, commandData];
      if (newScores.length > 8) {
        newScores.pop();
      }

      // Newest to oldest
      return newScores.sort((a, b) => parseDate(b.score.timeSet).getTime() - parseDate(a.score.timeSet).getTime());
    });
  }, [message]);

  if (!connected) {
    return <p>Not Connected to the ScoreSaber Websocket :(</p>;
  }

  if (scores.length == 0) {
    return <p>Waiting for scores...</p>;
  }

  return (
    <div className="flex flex-col divide-y divide-border">
      {scores.map(score => {
        const player = score.score.leaderboardPlayerInfo;
        return (
          <div key={score.score.id} className="flex flex-col py-2">
            <p className="text-sm">
              Set by{" "}
              <Link href={`/player/${player.id}`}>
                <span className="text-pp hover:brightness-75 transition-all transform-gpu">{player.name}</span>
              </Link>
            </p>
            <Score
              playerScore={score}
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
