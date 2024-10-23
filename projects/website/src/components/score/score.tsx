"use client";

import LeaderboardScores from "@/components/leaderboard/leaderboard-scores";
import { useEffect, useState } from "react";
import ScoreButtons from "./score-buttons";
import ScoreSongInfo from "./score-song-info";
import ScoreRankInfo from "./score-rank-info";
import ScoreStats from "./score-stats";
import { motion } from "framer-motion";
import { getPageFromRank } from "@ssr/common/utils/utils";
import { scoresaberService } from "@ssr/common/service/impl/scoresaber";
import { ScoreSaberScore } from "@ssr/common/model/score/impl/scoresaber-score";
import ScoreSaberLeaderboard from "@ssr/common/leaderboard/impl/scoresaber-leaderboard";
import { BeatSaverMap } from "@ssr/common/model/beatsaver/map";
import { useIsMobile } from "@/hooks/use-is-mobile";
import Card from "@/components/card";
import { MapStats } from "@/components/score/map-stats";
import PlayerScoreAccuracyChart from "@/components/leaderboard/chart/player-score-accuracy-chart";
import { useQuery } from "@tanstack/react-query";
import { fetchLeaderboardScores } from "@ssr/common/utils/score-utils";
import LeaderboardScoresResponse from "@ssr/common/response/leaderboard-scores-response";
import { ScoreStatsToken } from "@ssr/common/types/token/beatleader/score-stats/score-stats";
import { beatLeaderService } from "@ssr/common/service/impl/beatleader";

type Props = {
  /**
   * The leaderboard.
   */
  leaderboard: ScoreSaberLeaderboard;

  /**
   * The beat saver map for this song.
   */
  beatSaverMap?: BeatSaverMap;

  /**
   * The score to display.
   */
  score: ScoreSaberScore;

  /**
   * Score settings
   */
  settings?: {
    noScoreButtons: boolean;
  };
};

type LeaderboardDropdownData = {
  /**
   * The initial scores.
   */
  scores?: LeaderboardScoresResponse<ScoreSaberScore, ScoreSaberLeaderboard>;

  /**
   * The score stats for this score,
   */
  scoreStats?: ScoreStatsToken;
};

export default function Score({ leaderboard, beatSaverMap, score, settings }: Props) {
  const scoresPage = getPageFromRank(score.rank, 12);

  const isMobile = useIsMobile();
  const [baseScore, setBaseScore] = useState<number>(score.score);
  const [isLeaderboardExpanded, setIsLeaderboardExpanded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [leaderboardDropdownData, setLeaderboardDropdownData] = useState<LeaderboardDropdownData | undefined>();

  const { data, isError, isLoading } = useQuery<LeaderboardDropdownData>({
    queryKey: ["leaderboardDropdownData", leaderboard.id, score.id, isLeaderboardExpanded],
    queryFn: async () => {
      const scores = await fetchLeaderboardScores<ScoreSaberScore, ScoreSaberLeaderboard>(
        "scoresaber",
        leaderboard.id + "",
        scoresPage
      );
      const scoreStats = score.additionalData
        ? await beatLeaderService.lookupScoreStats(score.additionalData.scoreId)
        : undefined;

      return {
        scores: scores,
        scoreStats: scoreStats,
      };
    },
    staleTime: 30 * 1000,
    enabled: loading,
  });

  useEffect(() => {
    if (data) {
      setLeaderboardDropdownData({
        ...data,
        scores: data.scores,
        scoreStats: data.scoreStats,
      });
      setLoading(false);
    }
  }, [data]);

  const handleLeaderboardOpen = (isExpanded: boolean) => {
    if (!isExpanded) {
      setLeaderboardDropdownData(undefined);
    }

    setLoading(true);
    setIsLeaderboardExpanded(isExpanded);
  };

  /**
   * Set the base score
   */
  useEffect(() => {
    if (score?.score) {
      setBaseScore(score.score);
    }
  }, [score]);

  /**
   * Close the leaderboard when the score changes
   */
  useEffect(() => {
    setIsLeaderboardExpanded(false);
    setLeaderboardDropdownData(undefined);
  }, [score]);

  const accuracy = (baseScore / leaderboard.maxScore) * 100;
  const pp = baseScore === score.score ? score.pp : scoresaberService.getPp(leaderboard.stars, accuracy);

  // Dynamic grid column classes
  const gridColsClass = settings?.noScoreButtons
    ? "grid-cols-[20px 1fr_1fr] lg:grid-cols-[0.5fr_4fr_300px]" // Fewer columns if no buttons
    : "grid-cols-[20px 1fr_1fr] lg:grid-cols-[0.5fr_4fr_1fr_300px]"; // Original with buttons

  return (
    <div className="pb-2 pt-2">
      {/* Score Info */}
      <div className={`grid w-full gap-2 lg:gap-0 ${gridColsClass}`}>
        <ScoreRankInfo score={score} leaderboard={leaderboard} />
        <ScoreSongInfo leaderboard={leaderboard} beatSaverMap={beatSaverMap} />
        {settings?.noScoreButtons !== true && (
          <ScoreButtons
            leaderboard={leaderboard}
            beatSaverMap={beatSaverMap}
            score={score}
            alwaysSingleLine={isMobile}
            setIsLeaderboardExpanded={(isExpanded: boolean) => {
              handleLeaderboardOpen(isExpanded);
            }}
            updateScore={score => {
              setBaseScore(score.score);
            }}
          />
        )}
        <ScoreStats
          score={{
            ...score,
            score: baseScore,
            pp: pp ? pp : score.pp,
          }}
          leaderboard={leaderboard}
        />
      </div>

      {/* Leaderboard */}
      {isLeaderboardExpanded && leaderboardDropdownData && !loading && (
        <motion.div
          initial={{ opacity: 0, y: -50 }}
          exit={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full mt-2"
        >
          <Card className="flex gap-4 w-full relative border border-input">
            <MapStats leaderboard={leaderboard} beatSaver={beatSaverMap} />

            {leaderboardDropdownData.scoreStats && (
              <div className="flex gap-2">
                <PlayerScoreAccuracyChart scoreStats={leaderboardDropdownData.scoreStats} />
              </div>
            )}

            <LeaderboardScores
              initialPage={scoresPage}
              initialScores={leaderboardDropdownData.scores}
              leaderboard={leaderboard}
              disableUrlChanging
            />
          </Card>
        </motion.div>
      )}
    </div>
  );
}
