import { songNameToYouTubeLink } from "@/common/youtube-utils";
import YouTubeLogo from "@/components/logos/youtube-logo";
import ScoreButton from "@/components/score/button/score-button";
import { ScoreSaberLeaderboard } from "@ssr/common/model/leaderboard/impl/scoresaber-leaderboard";
import * as React from "react";

type SongOpenInYoutubeButtonProps = {
  leaderboard: ScoreSaberLeaderboard;
};

export function SongOpenInYoutubeButton({ leaderboard }: SongOpenInYoutubeButtonProps) {
  return (
    <ScoreButton
      href={songNameToYouTubeLink(
        leaderboard.songName,
        leaderboard.songSubName,
        leaderboard.songAuthorName
      )}
      tooltip={<p>Click to open the song in YouTube</p>}
    >
      <YouTubeLogo />
    </ScoreButton>
  );
}
