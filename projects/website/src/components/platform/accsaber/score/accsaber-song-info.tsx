"use client";

import { AccSaberScore } from "@ssr/common/api-service/impl/accsaber";
import Image from "next/image";

type AccSaberSongInfoProps = {
  score: AccSaberScore;
};

export function AccSaberSongInfo({ score }: AccSaberSongInfoProps) {
  return (
    <div className="flex gap-3 items-center break-all w-full">
      <div className="relative flex justify-center" style={{ height: 64 }}>
        <Image
          src={`https://cdn.beatsaver.com/${score.leaderboard.song.hash}.jpg`}
          width={64}
          height={64}
          alt={`${score.leaderboard.song.name}'s Artwork`}
          className="rounded-md"
          style={{
            minWidth: "64px",
          }}
        />
      </div>
      <div className="flex flex-col gap-1 w-full">
        <div className="overflow-y-clip flex flex-col gap-1 min-w-0 w-full">
          <p className="text-ssr break-all min-w-0 w-fit">{score.leaderboard.song.name}</p>
          <div className="flex flex-row text-sm gap-1.5 items-end leading-none">
            <p className="text-gray-400">
              {score.leaderboard.song.author}{" "}
              <span className="text-primary">
                <span className="text-xs leading-none">{score.leaderboard.song.mapper}</span>
              </span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
