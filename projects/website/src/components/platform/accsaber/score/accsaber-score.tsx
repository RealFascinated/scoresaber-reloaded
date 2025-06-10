"use client";

import { AccSaberScore } from "@ssr/common/api-service/impl/accsaber";
import { AccSaberBadges } from "./accsaber-badges";
import { AccSaberRankTime } from "./accsaber-rank-time";
import { AccSaberSongInfo } from "./accsaber-song-info";

type AccSaberScoreProps = {
  score: AccSaberScore;
};

export default function AccSaberScoreComponent({ score }: AccSaberScoreProps) {
  return (
    <div className={`relative`}>
      <div
        className={`grid w-full gap-2 lg:gap-0 grid-cols-[20px 1fr_1fr] lg:grid-cols-[0.5fr_4fr_350px] py-2`}
      >
        <AccSaberRankTime score={score} />
        <AccSaberSongInfo score={score} />
        <AccSaberBadges score={score} />
      </div>
    </div>
  );
}
