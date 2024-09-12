"use client";

import { copyToClipboard } from "@/common/browser-utils";
import ScoreSaberPlayerScore from "@/common/data-fetcher/types/scoresaber/scoresaber-player-score";
import BeatSaverMap from "@/common/database/types/beatsaver-map";
import { songNameToYouTubeLink } from "@/common/youtube-utils";
import BeatSaverLogo from "@/components/logos/beatsaver-logo";
import YouTubeLogo from "@/components/logos/youtube-logo";
import { useToast } from "@/hooks/use-toast";
import ScoreButton from "./score-button";

type Props = {
  playerScore: ScoreSaberPlayerScore;
  beatSaverMap?: BeatSaverMap;
};

export default function ScoreButtons({ playerScore, beatSaverMap }: Props) {
  const { leaderboard } = playerScore;
  const { toast } = useToast();

  return (
    <div className="flex flex-row justify-center flex-wrap gap-1 lg:justify-end">
      {beatSaverMap != undefined && (
        <>
          {/* Copy BSR */}
          <ScoreButton
            onClick={() => {
              toast({
                title: "Copied!",
                description: `Copied "!bsr ${beatSaverMap}" to your clipboard!`,
              });
              copyToClipboard(`!bsr ${beatSaverMap.bsr}`);
            }}
            tooltip={<p>Click to copy the bsr code</p>}
          >
            <p>!</p>
          </ScoreButton>

          {/* Open map in BeatSaver */}
          <ScoreButton
            onClick={() => {
              window.open(`https://beatsaver.com/maps/${beatSaverMap.bsr}`, "_blank");
            }}
            tooltip={<p>Click to open the map</p>}
          >
            <BeatSaverLogo />
          </ScoreButton>
        </>
      )}

      {/* Open song in YouTube */}
      <ScoreButton
        onClick={() => {
          window.open(
            songNameToYouTubeLink(leaderboard.songName, leaderboard.songSubName, leaderboard.songAuthorName),
            "_blank"
          );
        }}
        tooltip={<p>Click to open the song in YouTube</p>}
      >
        <YouTubeLogo />
      </ScoreButton>
    </div>
  );
}
