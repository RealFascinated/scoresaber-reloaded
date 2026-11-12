"use client";

import FallbackLink from "@/components/fallback-link";
import { MapPreviewButton } from "@/components/leaderboard/button/map-preview-button";
import { OneClickInstallButton } from "@/components/leaderboard/button/one-click-install-button";
import { BeatSaverMapButton } from "@/components/score/button/beat-saver-map-button";
import { ScoreCopyBsrButton } from "@/components/score/button/score-copy-bsr-button";
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { SharedIcons } from "@/shared-icons";
import { LeaderboardStarChange } from "@ssr/common/schemas/leaderboard/leaderboard-star-change";
import { LeaderboardResponse } from "@ssr/common/schemas/response/leaderboard/leaderboard";
import { getBeatSaverMapperProfileUrl } from "@ssr/common/utils/beatsaver.util";
import { formatNumber, formatNumberWithCommas } from "@ssr/common/utils/number-utils";
import { timeAgo } from "@ssr/common/utils/time-utils";
import NextImage from "next/image";
import { LeaderboardStarChangeHistory } from "./leaderboard-star-change-history";
import { LeaderboardStatus } from "./leaderboard-status";

type LeaderboardInfoProps = {
  leaderboard: LeaderboardResponse;
  starChangeHistory: LeaderboardStarChange[];
};

export function LeaderboardInfo({ leaderboard, starChangeHistory }: LeaderboardInfoProps) {
  const { leaderboard: leaderboardData, beatsaver } = leaderboard;

  const showStarHistory = leaderboardData.ranked && starChangeHistory.length > 0;
  const hasReweights = starChangeHistory.some(change => change.reweightId !== undefined);

  return (
    <section className="bg-card ring-border flex w-full flex-col gap-5 rounded-xl p-4 ring-1 sm:p-5">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:gap-6">
        <NextImage
          src={leaderboardData.songArt}
          alt={`${leaderboardData.songName} cover`}
          className="border-border/80 mx-auto shrink-0 rounded-xl border object-cover shadow-md sm:mx-0"
          width={160}
          height={160}
        />

        <div className="flex min-w-0 flex-1 flex-col items-center gap-2.5 text-center sm:items-start sm:text-left">
          <div className="flex items-center justify-center gap-2 sm:mx-0 sm:justify-start">
            <LeaderboardStatus leaderboard={leaderboardData} />
            {showStarHistory && (
              <Dialog>
                <DialogTrigger asChild>
                  <button
                    className="border-primary/50 bg-primary/10 text-primary hover:bg-primary/20 hover:border-primary focus-visible:ring-primary/50 flex cursor-pointer items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs font-bold uppercase transition-colors duration-200 focus-visible:ring-2 focus-visible:outline-hidden"
                    title="View star history and reweights"
                  >
                    <SharedIcons.LeaderboardStarHistoryIcon className="h-3.5 w-3.5" />
                    {hasReweights ? "Reweights" : "Star History"}
                  </button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-xl">
                  <DialogTitle>Star History</DialogTitle>
                  <LeaderboardStarChangeHistory starChangeHistory={starChangeHistory} />
                </DialogContent>
              </Dialog>
            )}
          </div>

          <FallbackLink
            href={beatsaver ? `https://beatsaver.com/maps/${beatsaver.bsr}` : undefined}
            className="hover:text-primary/80 transition-all sm:w-fit"
          >
            <h1 className="text-2xl leading-tight font-bold sm:text-3xl">{leaderboardData.fullName}</h1>
          </FallbackLink>

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
