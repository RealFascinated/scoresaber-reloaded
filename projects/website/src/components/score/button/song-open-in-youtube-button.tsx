import { songNameToYouTubeLink } from "@/common/youtube-utils";
import ScoreButton from "@/components/score/button/score-button";
import YouTubeLogo from "../../logos/logos/youtube-logo";

type SongOpenInYoutubeButtonProps = {
  songName: string;
  songSubName: string;
  songAuthorName: string;
};

export function SongOpenInYoutubeButton({
  songName,
  songSubName,
  songAuthorName,
}: SongOpenInYoutubeButtonProps) {
  return (
    <ScoreButton
      href={songNameToYouTubeLink(songName, songSubName, songAuthorName)}
      tooltip={<p>Click to open the song in YouTube</p>}
    >
      <YouTubeLogo />
    </ScoreButton>
  );
}
