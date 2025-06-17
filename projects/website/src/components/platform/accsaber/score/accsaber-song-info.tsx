"use client";

import { AccSaberScore } from "@ssr/common/api-service/impl/accsaber";
import Image from "next/image";

type AccSaberSongInfoProps = {
  score: AccSaberScore;
};

export function AccSaberSongInfo({ score }: AccSaberSongInfoProps) {
  return (
    <div className="flex w-full items-center gap-3 break-all">
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
      <div className="flex w-full flex-col gap-1">
        <div className="flex w-full min-w-0 flex-col gap-1 overflow-y-clip">
          <p className="text-ssr w-fit min-w-0 break-all">{score.leaderboard.song.name}</p>
          <div className="flex flex-row items-end gap-1.5 text-sm leading-none">
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
