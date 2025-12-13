"use client";

import ScoreSaberPlayer from "@ssr/common/player/impl/scoresaber-player";
import ScoreSaberPlayerScoresLive from "./scoresaber-player-scores-live";
import ScoreSaberPlayerScoresSSR from "./scoresaber-player-scores-ssr";
import { useScoreModeSelector } from "./scoresaber-score-mode-selector";

interface ScoreSaberPlayerScoresProps {
  player: ScoreSaberPlayer;
}

export default function ScoreSaberPlayerScores({ player }: ScoreSaberPlayerScoresProps) {
  const { mode } = useScoreModeSelector();

  return (
    <>
      {mode === "live" ? (
        <ScoreSaberPlayerScoresLive player={player} />
      ) : (
        <ScoreSaberPlayerScoresSSR player={player} mode="ssr" />
      )}
    </>
  );
}
