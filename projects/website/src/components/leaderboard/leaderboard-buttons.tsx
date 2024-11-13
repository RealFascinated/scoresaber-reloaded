import * as React from "react";
import { ScoreBsrButton } from "@/components/score/button/score-bsr-button";
import { BeatSaverMapButton } from "@/components/score/button/beat-saver-map-button";
import { SongOpenInYoutubeButton } from "@/components/score/button/song-open-in-youtube-button";
import { ScoreSaberLeaderboard } from "@ssr/common/model/leaderboard/impl/scoresaber-leaderboard";
import { BeatSaverMapResponse } from "@ssr/common/response/beatsaver-map-response";

type Props = {
  leaderboard: ScoreSaberLeaderboard;
  beatSaverMap?: BeatSaverMapResponse;
};

const buttons = [
  {
    render: ({ beatSaverMap }: Props) => {
      if (!beatSaverMap) {
        return null;
      }
      return <ScoreBsrButton beatSaverMap={beatSaverMap} />;
    },
  },
  {
    render: ({ beatSaverMap }: Props) => {
      if (!beatSaverMap) {
        return null;
      }
      return <BeatSaverMapButton beatSaverMap={beatSaverMap} />;
    },
  },
  {
    render: ({ leaderboard }: Props) => {
      return <SongOpenInYoutubeButton leaderboard={leaderboard} />;
    },
  },
];

export default function LeaderboardButtons({ leaderboard, beatSaverMap }: Props) {
  return (
    <div className={`flex gap-1 items-center justify-center`}>
      {buttons.map((button, index) => {
        const { render } = button;

        const buttonElement = render({
          leaderboard,
          beatSaverMap,
        });

        if (!buttonElement) {
          return null;
        }

        return <div key={index}>{buttonElement}</div>;
      })}
    </div>
  );
}
