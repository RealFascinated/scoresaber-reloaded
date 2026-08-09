import { isBackendUnavailableError } from "@/common/api-error";
import BackendUnavailable from "@/components/api/backend-unavailable";
import { ScoreOverview } from "@/components/platform/scoresaber/score/score-views/score-overview";
import ScoreDetails from "@/components/score/page/components/score-details";
import { SharedIcons } from "@/shared-icons";
import { env } from "@ssr/common/env";
import { getDecodedReplay } from "@ssr/common/replay/replay-utils";
import type { ScoreSaberScore } from "@ssr/common/schemas/scoresaber/score/score";
import type { PlayerScore } from "@ssr/common/score/player-score";
import { formatNumberWithCommas, formatPp } from "@ssr/common/utils/number-utils";
import { getDifficultyName } from "@ssr/common/utils/song-utils";
import { ssrApi } from "@ssr/common/utils/ssr-api";
import { formatDate } from "@ssr/common/utils/time-utils";
import { ssrConfig } from "config";
import { Metadata } from "next";
import { cache } from "react";
import CutDistributionChart from "../../../../components/score/page/components/charts/cut-distribution-chart";
import SwingSpeedChart from "../../../../components/score/page/components/charts/swing-speed-chart";

const UNKNOWN_SCORE = {
  title: "Score Not Found",
  description: "This score could not be found or may have been removed.",
};

type ScorePageProps = {
  params: Promise<{
    scoreId: string;
  }>;
};

type ScoreFetchResult =
  | { status: "found"; score: PlayerScore<ScoreSaberScore> }
  | { status: "not-found" }
  | { status: "unavailable" };

const getPlayerScore = cache(async (scoreId: string): Promise<ScoreFetchResult> => {
  try {
    const score = await ssrApi.getScore(scoreId);
    if (score === undefined) {
      return { status: "not-found" };
    }
    return { status: "found", score };
  } catch (error) {
    if (isBackendUnavailableError(error)) {
      return { status: "unavailable" };
    }
    throw error;
  }
});

export async function generateMetadata(props: ScorePageProps): Promise<Metadata> {
  const { scoreId } = await props.params;
  const result = await getPlayerScore(scoreId);

  if (result.status === "unavailable") {
    return {
      title: "Backend Unavailable",
      description: "The backend is currently offline or unreachable. Please try again later.",
    };
  }

  if (result.status === "not-found") {
    return {
      title: UNKNOWN_SCORE.title,
      description: UNKNOWN_SCORE.description,
      openGraph: {
        siteName: env.NEXT_PUBLIC_WEBSITE_NAME ?? ssrConfig.siteName,
        title: UNKNOWN_SCORE.title,
        description: UNKNOWN_SCORE.description,
        images: ["/icon-512x512.png"],
      },
    };
  }

  const { score, leaderboard } = result.score;
  const playerName = score.playerInfo!.name;
  const songTitle = leaderboard.fullName;
  const diffLabel = getDifficultyName(leaderboard.difficulty.difficulty);
  const ppOrScore =
    leaderboard.stars > 0 ? `${formatPp(score.pp)}pp` : `Score ${formatNumberWithCommas(score.score)}`;

  const title = `${playerName} · ${songTitle}`;
  const description = [
    `${score.accuracy.toFixed(2)}%`,
    ppOrScore,
    diffLabel,
    formatDate(score.timestamp, "Do MMMM, YYYY HH:mm a"),
  ].join(" · ");

  return {
    title,
    description,
    openGraph: {
      siteName: env.NEXT_PUBLIC_WEBSITE_NAME ?? ssrConfig.siteName,
      title,
      description,
      ...(leaderboard.songArt
        ? {
            images: [
              {
                url: leaderboard.songArt,
              },
            ],
          }
        : {}),
    },
    twitter: {
      card: "summary",
    },
  };
}

export default async function ScorePage({ params }: ScorePageProps) {
  const { scoreId } = await params;
  const result = await getPlayerScore(scoreId);

  if (result.status === "unavailable") {
    return <BackendUnavailable />;
  }

  if (result.status === "not-found") {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <SharedIcons.WarningAlertIcon className="size-16 text-amber-500" />
        <h2 className="text-xl font-semibold">Score Not Found</h2>
        <p className="text-muted-foreground">This score could not be found or may have been removed.</p>
      </div>
    );
  }

  const playerScore = result.score;
  const beatLeaderScoreId = playerScore.score.beatLeaderScore?.scoreId;

  let scoreStats: Awaited<ReturnType<typeof ssrApi.fetchScoreStats>> | undefined;
  let replay: Awaited<ReturnType<typeof getDecodedReplay>> | undefined;
  try {
    [scoreStats, replay] = await Promise.all([
      beatLeaderScoreId ? ssrApi.fetchScoreStats(beatLeaderScoreId) : undefined,
      beatLeaderScoreId ? getDecodedReplay(beatLeaderScoreId.toString()) : undefined,
    ]);
  } catch (error) {
    if (isBackendUnavailableError(error)) {
      return <BackendUnavailable />;
    }
    throw error;
  }

  // Check if we have any additional data to show
  const hasScoreStats = !!scoreStats;
  const hasReplay = !!replay;
  const hasAnyAdditionalData = hasScoreStats || hasReplay;

  return (
    <div className="flex w-full flex-col gap-4">
      <ScoreDetails score={playerScore} />

      {!hasAnyAdditionalData ? (
        <div className="ring-border bg-card flex flex-col items-center justify-center gap-2 rounded-xl py-8 text-center ring-1">
          <SharedIcons.LeaderboardEmptyStateIcon className="text-muted-foreground size-10" />
          <h3 className="font-semibold">Basic Score View</h3>
          <p className="text-muted-foreground max-w-sm text-sm">
            Advanced stats and replay analysis are only available for scores tracked by BeatLeader.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {scoreStats && (
            <ScoreOverview
              score={playerScore.score}
              scoreStats={scoreStats}
              leaderboard={playerScore.leaderboard}
            />
          )}

          {replay && (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <CutDistributionChart cutDistribution={replay.cutDistribution} />
              <SwingSpeedChart
                swingSpeed={replay.swingSpeed}
                replayLengthSeconds={replay.replayLengthSeconds}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
