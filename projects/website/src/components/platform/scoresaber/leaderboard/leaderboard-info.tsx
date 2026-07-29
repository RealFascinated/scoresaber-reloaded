"use client";

import FallbackLink from "@/components/fallback-link";
import { MapPreviewButton } from "@/components/leaderboard/button/map-preview-button";
import { OneClickInstallButton } from "@/components/leaderboard/button/one-click-install-button";
import { BeatSaverMapButton } from "@/components/score/button/beat-saver-map-button";
import { ScoreCopyBsrButton } from "@/components/score/button/score-copy-bsr-button";
import { SharedIcons } from "@/shared-icons";
import { LeaderboardResponse } from "@ssr/common/schemas/response/leaderboard/leaderboard";
import { getBeatSaverMapperProfileUrl } from "@ssr/common/utils/beatsaver.util";
import { formatNumber, formatNumberWithCommas } from "@ssr/common/utils/number-utils";
import { timeAgo } from "@ssr/common/utils/time-utils";
import NextImage from "next/image";
import { LeaderboardStatus } from "./leaderboard-status";

type LeaderboardInfoProps = {
  leaderboard: LeaderboardResponse;
};

export function LeaderboardInfo({ leaderboard }: LeaderboardInfoProps) {
  const { leaderboard: leaderboardData, beatsaver } = leaderboard;

  return (
    <section className="flex w-full flex-col gap-5">
      {/* Song header */}
      <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:gap-6">
        {/* Album Art */}
        <NextImage
          src={leaderboardData.songArt}
          alt={`${leaderboardData.songName} cover`}
          className="border-border/80 mx-auto shrink-0 rounded-xl border object-cover shadow-md sm:mx-0"
          width={160}
          height={160}
        />

        {/* Song info */}
        <div className="flex min-w-0 flex-1 flex-col items-center gap-2.5 text-center sm:items-start sm:text-left">
          {/* Status Badge */}
          <div className="sm:mx-0">
            <LeaderboardStatus leaderboard={leaderboardData} />
          </div>

          {/* Song Name */}
          <FallbackLink
            href={beatsaver ? `https://beatsaver.com/maps/${beatsaver.bsr}` : undefined}
            className="hover:text-primary/80 transition-all sm:w-fit"
          >
            <h1 className="text-2xl leading-tight font-bold sm:text-3xl">{leaderboardData.fullName}</h1>
          </FallbackLink>

          {/* Author and Mapper */}
          <p className="text-muted-foreground text-sm">
            by <span className="text-foreground font-medium">{leaderboardData.songAuthorName}</span>
            {" · "}
            mapped by{" "}
            <FallbackLink
              href={getBeatSaverMapperProfileUrl(beatsaver)}
              className="text-foreground hover:text-primary/80 font-medium transition-all"
            >
              {leaderboardData.levelAuthorName}
            </FallbackLink>
          </p>

          {/* Map action buttons */}
          {beatsaver && (
            <div className="flex items-center justify-center gap-1 sm:justify-start">
              <ScoreCopyBsrButton beatSaverMap={beatsaver} />
              <BeatSaverMapButton beatSaverMap={beatsaver} />
              <MapPreviewButton leaderboard={leaderboardData} beatSaverMap={beatsaver} />
              <OneClickInstallButton beatSaverMap={beatsaver} />
            </div>
          )}
        </div>
      </div>

      {/* BeatSaver stats */}
      {beatsaver && (
        <div className="text-muted-foreground flex flex-wrap items-center justify-center gap-x-6 gap-y-1.5 text-xs sm:justify-start">
          <span className="flex items-center gap-1.5">
            <SharedIcons.MapNjsStatIcon className="size-3.5" />
            <span className="text-foreground font-semibold tabular-nums">
              {formatNumber(beatsaver.difficulty.njs, "number")}
            </span>
            <span>NJS</span>
          </span>
          <span className="flex items-center gap-1.5">
            <SharedIcons.MapBpmStatIcon className="size-3.5" />
            <span className="text-foreground font-semibold tabular-nums">
              {formatNumber(beatsaver.metadata.bpm, "number")}
            </span>
            <span>BPM</span>
          </span>
          <span className="flex items-center gap-1.5">
            <SharedIcons.MapNpsStatIcon className="size-3.5" />
            <span className="text-foreground font-semibold tabular-nums">
              {beatsaver.difficulty.nps.toFixed(2)}
            </span>
            <span>NPS</span>
          </span>
          <span className="flex items-center gap-1.5">
            <SharedIcons.MapNotesStatIcon className="size-3.5" />
            <span className="text-foreground font-semibold tabular-nums">
              {formatNumberWithCommas(beatsaver.difficulty.notes)}
            </span>
            <span>Notes</span>
          </span>
          <span className="flex items-center gap-1.5">
            <SharedIcons.MapBombsStatIcon className="size-3.5" />
            <span className="text-foreground font-semibold tabular-nums">
              {formatNumberWithCommas(beatsaver.difficulty.bombs)}
            </span>
            <span>Bombs</span>
          </span>
          <span className="flex items-center gap-1.5">
            <SharedIcons.MapObstaclesStatIcon className="size-3.5" />
            <span className="text-foreground font-semibold tabular-nums">
              {formatNumberWithCommas(beatsaver.difficulty.obstacles)}
            </span>
            <span>Obstacles</span>
          </span>
          <span className="flex items-center gap-1.5">
            <SharedIcons.ScoreDateIcon className="size-3.5" />
            <span className="text-foreground tabular-nums">{timeAgo(leaderboardData.timestamp)}</span>
          </span>
          <span className="flex items-center gap-1.5">
            <SharedIcons.StatTotalPlayCountIcon className="size-3.5" />
            <span className="text-foreground font-semibold tabular-nums">
              {formatNumberWithCommas(leaderboardData.plays)}
            </span>
            <span>plays</span>
          </span>
        </div>
      )}
    </section>
  );
}
