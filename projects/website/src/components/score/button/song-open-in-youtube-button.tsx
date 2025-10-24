import { songNameToYouTubeLink } from "@/common/youtube-utils";
import YouTubeLogo from "@/components/logos/youtube-logo";
import ScoreButton from "@/components/score/button/score-button";

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
      data-umami-event="song-open-youtube-button"
    >
      <YouTubeLogo />
    </ScoreButton>
  );
}
