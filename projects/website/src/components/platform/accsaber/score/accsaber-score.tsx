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
        className={`grid-cols-[20px 1fr_1fr] grid w-full gap-2 py-2 lg:grid-cols-[0.5fr_4fr_350px] lg:gap-0`}
      >
        <AccSaberRankTime score={score} />
        <AccSaberSongInfo score={score} />
        <AccSaberBadges score={score} />
      </div>
    </div>
  );
}
