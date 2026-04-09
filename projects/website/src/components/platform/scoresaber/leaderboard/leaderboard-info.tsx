"use client";

import Card from "@/components/card";
import FallbackLink from "@/components/fallback-link";
import LeaderboardButtons from "@/components/platform/scoresaber/leaderboard/leaderboard-buttons";
import { LeaderboardResponse } from "@ssr/common/schemas/response/leaderboard/leaderboard";
import { getBeatSaverMapperProfileUrl } from "@ssr/common/utils/beatsaver.util";
import { formatNumberWithCommas } from "@ssr/common/utils/number-utils";
import { getDifficulty, getDifficultyName } from "@ssr/common/utils/song-utils";
import NextImage from "next/image";
import type { CSSProperties } from "react";

type LeaderboardInfoProps = {
  leaderboard: LeaderboardResponse;
};

export function LeaderboardInfo({ leaderboard }: LeaderboardInfoProps) {
  const { leaderboard: leaderboardData, beatsaver: beatSaverMap, starChangeHistory } = leaderboard;

  const accentColor = getDifficulty(leaderboardData.difficulty.difficulty).color;

  /** One soft wash only — low mix so difficulty color doesn’t dominate the whole card. */
  const cardSurfaceStyle: CSSProperties = {
    backgroundColor: "var(--card)",
    backgroundImage: `linear-gradient(
      to bottom,
      color-mix(in srgb, ${accentColor} 16%, var(--card)) 0%,
      var(--card) 38%,
      var(--card) 100%
    )`,
  };

  return (
    <Card className="h-fit w-full flex-col items-center gap-8 overflow-hidden p-0" style={cardSurfaceStyle}>
      <div className="flex flex-col items-center gap-3 p-6 text-center">
        <NextImage
          src={leaderboardData.songArt}
          alt={`${leaderboardData.songName} Cover Image`}
          className="border-border/80 rounded-xl border object-cover shadow-md"
          width={128}
          height={128}
        />

        <div className="flex max-w-[900px] min-w-0 flex-col items-center gap-1">
          <FallbackLink
            href={beatSaverMap ? `https://beatsaver.com/maps/${beatSaverMap.bsr}` : undefined}
            className="hover:text-primary/80 text-song-name w-fit max-w-full min-w-0 transition-all"
          >
            <h3 className="line-clamp-2 text-2xl leading-tight font-bold wrap-break-word">
              {leaderboardData.fullName}
            </h3>
          </FallbackLink>
          <p className="text-muted-foreground text-sm">{leaderboardData.songAuthorName}</p>
          <p className="text-muted-foreground text-sm">
            Mapped by{" "}
            <FallbackLink
              href={getBeatSaverMapperProfileUrl(beatSaverMap)}
              className="text-foreground hover:text-primary/80 transition-all"
            >
              {leaderboardData.levelAuthorName}
            </FallbackLink>
          </p>
        </div>
      </div>

      <div className="flex w-full max-w-3xl flex-wrap justify-between gap-x-4 gap-y-6 px-1 sm:gap-x-8">
        <LeaderboardStatColumn label={leaderboard.leaderboard.ranked ? "Stars" : "Difficulty"}>
          {leaderboard.leaderboard.ranked ? (
            <span className="tabular-nums">{leaderboardData.stars.toFixed(2)}</span>
          ) : (
            <span className="max-w-[140px] truncate text-sm sm:text-base">
              {getDifficultyName(leaderboardData.difficulty.difficulty)}
            </span>
          )}
        </LeaderboardStatColumn>
        <LeaderboardStatColumn label="Status">
          <span className="uppercase">{leaderboard.leaderboard.status}</span>
        </LeaderboardStatColumn>
        <LeaderboardStatColumn label="Plays">
          {formatNumberWithCommas(leaderboardData.plays)}
        </LeaderboardStatColumn>
        <LeaderboardStatColumn label="Plays 24h">
          {formatNumberWithCommas(leaderboardData.dailyPlays)}
        </LeaderboardStatColumn>
      </div>

      <div className="bg-background/70 flex w-full items-center justify-center gap-1 py-2.5">
        <LeaderboardButtons
          leaderboard={leaderboardData}
          beatSaverMap={beatSaverMap}
          starChangeHistory={starChangeHistory}
        />
      </div>
    </Card>
  );
}

function LeaderboardStatColumn({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex min-w-0 flex-1 basis-[45%] flex-col items-center gap-1 text-center sm:basis-0">
      <p className="text-muted-foreground text-[10px] font-medium tracking-wide uppercase">{label}</p>
      <div className="text-foreground text-base leading-tight font-semibold tabular-nums sm:text-lg">
        {children}
      </div>
    </div>
  );
}
