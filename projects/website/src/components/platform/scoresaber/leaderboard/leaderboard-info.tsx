"use client";

import FallbackLink from "@/components/fallback-link";
import { MapPreviewButton } from "@/components/leaderboard/button/map-preview-button";
import { OneClickInstallButton } from "@/components/leaderboard/button/one-click-install-button";
import { BeatSaverMapButton } from "@/components/score/button/beat-saver-map-button";
import { ScoreCopyBsrButton } from "@/components/score/button/score-copy-bsr-button";
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { SharedIcons } from "@/shared-icons";
import { LeaderboardResponse } from "@ssr/common/schemas/response/leaderboard/leaderboard";
import { getBeatSaverMapperProfileUrl } from "@ssr/common/utils/beatsaver.util";
import { formatNumber, formatNumberWithCommas } from "@ssr/common/utils/number-utils";
import { timeAgo } from "@ssr/common/utils/time-utils";
import NextImage from "next/image";
import { LeaderboardStarChangeHistory } from "./leaderboard-star-change-history";
import { LeaderboardStatus } from "./leaderboard-status";

type LeaderboardInfoProps = {
  leaderboard: LeaderboardResponse;
};

export function LeaderboardInfo({ leaderboard }: LeaderboardInfoProps) {
  const { leaderboard: leaderboardData, beatsaver } = leaderboard;

  const showStarHistory = leaderboardData.ranked;

  return (
    <section className="flex w-full flex-col gap-5 rounded-xl bg-card p-4 ring-1 ring-border sm:p-5">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:gap-6">
        <NextImage
          src={leaderboardData.songArt}
          alt={`${leaderboardData.songName} cover`}
          className="mx-auto shrink-0 rounded-xl border border-border/80 object-cover shadow-md sm:mx-0"
          width={160}
          height={160}
          priority
        />

        <div className="flex min-w-0 flex-1 flex-col items-center gap-2.5 text-center sm:items-start sm:text-left">
          <div className="flex items-center justify-center gap-2 sm:mx-0 sm:justify-start">
            <LeaderboardStatus leaderboard={leaderboardData} />
            {showStarHistory && (
              <Dialog>
                <DialogTrigger asChild>
                  <button
                    className="flex cursor-pointer items-center gap-1.5 rounded-md border border-primary/50 bg-primary/10 px-2 py-0.5 text-xs font-bold text-primary uppercase transition-colors duration-200 hover:border-primary hover:bg-primary/20 focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:outline-hidden"
                    title="View star history and ranked batches"
                  >
                    <SharedIcons.LeaderboardStarHistoryIcon className="h-3.5 w-3.5" />
                    Star History
                  </button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-xl">
                  <DialogTitle>Star History</DialogTitle>
                  <LeaderboardStarChangeHistory leaderboardId={leaderboardData.id} />
                </DialogContent>
              </Dialog>
            )}
          </div>

          <FallbackLink
            href={beatsaver ? `https://beatsaver.com/maps/${beatsaver.bsr}` : undefined}
            className="transition-all hover:text-primary/80 sm:w-fit"
          >
            <h1 className="text-2xl leading-tight font-bold sm:text-3xl">{leaderboardData.fullName}</h1>
          </FallbackLink>

          <p className="text-sm text-muted-foreground">
            by <span className="font-medium text-foreground">{leaderboardData.songAuthorName}</span>
            {" · "}
            mapped by{" "}
            <FallbackLink
              href={getBeatSaverMapperProfileUrl(beatsaver)}
              className="font-medium text-foreground transition-all hover:text-primary/80"
            >
              {leaderboardData.levelAuthorName}
            </FallbackLink>
          </p>

          {(beatsaver || showStarHistory) && (
            <div className="flex items-center justify-center gap-1 sm:justify-start">
              {beatsaver && (
                <>
                  <ScoreCopyBsrButton beatSaverMap={beatsaver} />
                  <BeatSaverMapButton beatSaverMap={beatsaver} />
                  <MapPreviewButton leaderboard={leaderboardData} beatSaverMap={beatsaver} />
                  <OneClickInstallButton beatSaverMap={beatsaver} />
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {beatsaver && (
        <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-1.5 text-xs text-muted-foreground sm:justify-start">
          <span className="flex items-center gap-1.5">
            <SharedIcons.MapNjsStatIcon className="size-3.5" />
            <span className="font-semibold text-foreground tabular-nums">
              {formatNumber(beatsaver.difficulty.njs, "number")}
            </span>
            <span>NJS</span>
          </span>
          <span className="flex items-center gap-1.5">
            <SharedIcons.MapBpmStatIcon className="size-3.5" />
            <span className="font-semibold text-foreground tabular-nums">
              {formatNumber(beatsaver.metadata.bpm, "number")}
            </span>
            <span>BPM</span>
          </span>
          <span className="flex items-center gap-1.5">
            <SharedIcons.MapNpsStatIcon className="size-3.5" />
            <span className="font-semibold text-foreground tabular-nums">
              {beatsaver.difficulty.nps.toFixed(2)}
            </span>
            <span>NPS</span>
          </span>
          <span className="flex items-center gap-1.5">
            <SharedIcons.MapNotesStatIcon className="size-3.5" />
            <span className="font-semibold text-foreground tabular-nums">
              {formatNumberWithCommas(beatsaver.difficulty.notes)}
            </span>
            <span>Notes</span>
          </span>
          <span className="flex items-center gap-1.5">
            <SharedIcons.MapBombsStatIcon className="size-3.5" />
            <span className="font-semibold text-foreground tabular-nums">
              {formatNumberWithCommas(beatsaver.difficulty.bombs)}
            </span>
            <span>Bombs</span>
          </span>
          <span className="flex items-center gap-1.5">
            <SharedIcons.MapObstaclesStatIcon className="size-3.5" />
            <span className="font-semibold text-foreground tabular-nums">
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
            <span className="font-semibold text-foreground tabular-nums">
              {formatNumberWithCommas(leaderboardData.plays)}
            </span>
            <span>plays</span>
          </span>
        </div>
      )}
    </section>
  );
}
