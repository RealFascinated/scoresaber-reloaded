import { isBackendUnavailableError } from "@/common/api-error";
import BackendUnavailable from "@/components/api/backend-unavailable";
import PlayerScoreAccuracyChart from "@/components/platform/scoresaber/score/chart/player-score-accuracy-chart";
import BlockPositionCard from "@/components/score/page/components/block-position-card";
import DirectionBreakdown from "@/components/score/page/components/direction-breakdown";
import HandComparison from "@/components/score/page/components/hand-comparison";
import ScoreHero from "@/components/score/page/components/score-hero";
import ScoreKpiStrip from "@/components/score/page/components/score-kpi-strip";
import ScoreLossCard from "@/components/score/page/components/score-loss-card";
import ScoreMapSection from "@/components/score/page/components/score-map-section";
import { ScoreSection, ScoreSectionNav } from "@/components/score/page/components/score-section";
import ScoreTimeline from "@/components/score/page/components/score-timeline";
import TakeawaysCard from "@/components/score/page/components/takeaways-card";
import { computeReplayInsights } from "@/components/score/page/replay-insights";
import { buildTakeaways } from "@/components/score/page/replay-takeaways";
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
        <SharedIcons.WarningAlertIcon className="text-warning size-16" />
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

  const { score, leaderboard, beatSaver } = playerScore;
  const hasMap = !!beatSaver?.difficulty;

  const insights = replay ? computeReplayInsights(replay.rawReplay) : undefined;
  const takeaways = insights ? buildTakeaways(insights, score) : [];

  const sections = [
    { id: "performance", label: "Performance", show: true },
    { id: "analysis", label: "Where You Lose Points", show: !!insights },
    { id: "swing", label: "Swing", show: !!replay },
  ].filter(section => section.show);

  return (
    <div className="flex w-full flex-col gap-4">
      <ScoreHero score={playerScore} />
      <ScoreKpiStrip score={score} />
      {hasMap && beatSaver && <ScoreMapSection beatSaver={beatSaver} />}
      {takeaways.length > 0 && <TakeawaysCard takeaways={takeaways} />}
      <ScoreSectionNav sections={sections} />

      <ScoreSection id="performance" title="Performance">
        {insights && <ScoreTimeline insights={insights} />}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {scoreStats && (
            <div className="flex flex-col lg:col-span-2">
              <PlayerScoreAccuracyChart scoreStats={scoreStats} leaderboard={leaderboard} />
            </div>
          )}
          <div className={scoreStats ? "flex flex-col gap-4" : "flex flex-col gap-4 lg:col-span-3"}>
            {insights && <ScoreLossCard insights={insights} />}
          </div>
        </div>
        {!insights && (
          <p className="text-muted-foreground text-sm">
            Detailed analysis is only available for scores with a saved BeatLeader replay.
          </p>
        )}
      </ScoreSection>

      {insights && (
        <ScoreSection id="analysis" title="Where You Lose Points">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <DirectionBreakdown insights={insights} />
            <BlockPositionCard insights={insights} />
            <HandComparison insights={insights} />
          </div>
        </ScoreSection>
      )}

      {replay && (
        <ScoreSection id="swing" title="Swing">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <CutDistributionChart cutDistribution={replay.cutDistribution} />
            <SwingSpeedChart
              swingSpeed={replay.swingSpeed}
              replayLengthSeconds={replay.replayLengthSeconds}
            />
          </div>
        </ScoreSection>
      )}
    </div>
  );
}
