"use client";

import { ReactElement, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { CubeIcon } from "@heroicons/react/24/solid";
import { TrendingUpIcon } from "lucide-react";
import ScoreButtons from "./score-buttons";
import ScoreSongInfo from "./score-song-info";
import ScoreInfo from "./score-info";
import ScoreStats from "./score-stats";
import Card from "@/components/card";
import { MapStats } from "@/components/score/map-stats";
import { Button } from "@/components/ui/button";
import { ScoreOverview } from "@/components/score/score-views/score-overview";
import { ScoreHistory } from "@/components/score/score-views/score-history";

import { getPageFromRank } from "@ssr/common/utils/utils";
import { scoresaberService } from "@ssr/common/service/impl/scoresaber";
import { useIsMobile } from "@/hooks/use-is-mobile";

import { ScoreSaberScore } from "@ssr/common/model/score/impl/scoresaber-score";
import ScoreSaberLeaderboard from "@ssr/common/model/leaderboard/impl/scoresaber-leaderboard";
import ScoreSaberPlayer from "@ssr/common/player/impl/scoresaber-player";
import { BeatSaverMapResponse } from "@ssr/common/response/beatsaver-map-response";
import LeaderboardScores from "@/components/leaderboard/leaderboard-scores";
import { Separator } from "@/components/ui/separator";
import { ScoreStatsResponse } from "@ssr/common/response/scorestats-response";
import { ssrApi } from "@ssr/common/utils/ssr-api";

type Props = {
  highlightedPlayer?: ScoreSaberPlayer;
  score: ScoreSaberScore;
  leaderboard: ScoreSaberLeaderboard;
  beatSaverMap?: BeatSaverMapResponse;
  settings?: {
    noScoreButtons?: boolean;
    hideLeaderboardDropdown?: boolean;
    hideAccuracyChanger?: boolean;
  };
};

type DropdownData = {
  scoreStats?: ScoreStatsResponse;
};

type Mode = {
  name: string;
  icon: ReactElement;
};

const modes: Mode[] = [
  { name: "Overview", icon: <CubeIcon className="w-4 h-4" /> },
  { name: "Score History", icon: <TrendingUpIcon className="w-4 h-4" /> },
];

export default function Score({ leaderboard, beatSaverMap, score, settings, highlightedPlayer }: Props) {
  const [baseScore, setBaseScore] = useState(score.score);
  const [isLeaderboardExpanded, setIsLeaderboardExpanded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [dropdownData, setDropdownData] = useState<DropdownData | undefined>();
  const [selectedMode, setSelectedMode] = useState<Mode>(modes[0]);

  const scoresPage = getPageFromRank(score.rank, 12);
  const isMobile = useIsMobile();

  const { data, isLoading } = useQuery<DropdownData>({
    queryKey: [`leaderboardDropdownData:${leaderboard.id}`, leaderboard.id, score.scoreId, isLeaderboardExpanded],
    queryFn: async () => {
      return { scoreStats: score.additionalData ? await ssrApi.fetchScoreStats(score.additionalData.scoreId) : undefined };
    },
    staleTime: 30000,
    enabled: loading,
  });

  useEffect(() => {
    if (data) {
      setDropdownData(data);
      setLoading(false);
    }
  }, [data]);

  useEffect(() => {
    /**
     * Reset the leaderboard dropdown when the score changes
     */
    setIsLeaderboardExpanded(false);
    setDropdownData(undefined);
    setSelectedMode(modes[0]);
  }, [score.scoreId]);

  useEffect(() => {
    setBaseScore(score.score);
  }, [score]);

  const accuracy = (baseScore / leaderboard.maxScore) * 100;
  const pp = baseScore === score.score ? score.pp : scoresaberService.getPp(leaderboard.stars, accuracy);

  const handleLeaderboardOpen = (isExpanded: boolean) => {
    if (!isExpanded) {
      setSelectedMode(modes[0]);
      setDropdownData(undefined);
    } else {
      setLoading(true);
    }
    setIsLeaderboardExpanded(isExpanded);
  };

  const handleModeChange = (mode: Mode) => {
    setSelectedMode(mode);
  };

  const gridColsClass = settings?.noScoreButtons
    ? "grid-cols-[20px 1fr_1fr] lg:grid-cols-[0.5fr_4fr_350px]" // Fewer columns if no buttons
    : "grid-cols-[20px 1fr_1fr] lg:grid-cols-[0.5fr_4fr_1fr_350px]"; // Original with buttons

  return (
    <div className="pb-2 pt-2">
      <div className={`grid w-full gap-2 lg:gap-0 ${gridColsClass}`}>
        <ScoreInfo score={score} leaderboard={leaderboard} />
        <ScoreSongInfo leaderboard={leaderboard} beatSaverMap={beatSaverMap} />
        {!settings?.noScoreButtons && (
          <ScoreButtons
            leaderboard={leaderboard}
            beatSaverMap={beatSaverMap}
            score={score}
            alwaysSingleLine={isMobile}
            hideLeaderboardDropdown={settings?.hideLeaderboardDropdown}
            hideAccuracyChanger={settings?.hideAccuracyChanger}
            setIsLeaderboardExpanded={handleLeaderboardOpen}
            isLeaderboardLoading={isLoading}
            updateScore={updatedScore => setBaseScore(updatedScore.score)}
          />
        )}
        <ScoreStats score={{ ...score, accuracy, pp }} leaderboard={leaderboard} />
      </div>

      {isLeaderboardExpanded && dropdownData && !loading && (
        <motion.div
          initial={{ opacity: 0, y: -50 }}
          exit={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full mt-2"
        >
          <Card className="flex gap-4 w-full relative border border-input">
            <div className="flex flex-col w-full gap-2 justify-center items-center">
              {/* Modes */}
              <div className="flex clex-col justify-center lg:justify-start gap-2">
                {modes.map((mode, i) => (
                  <Button
                    key={i}
                    variant={mode.name === selectedMode.name ? "default" : "outline"}
                    onClick={() => handleModeChange(mode)}
                    className="flex gap-2"
                  >
                    {mode.icon}
                    <p>{mode.name}</p>
                  </Button>
                ))}
              </div>

              {/* Map stats */}
              {beatSaverMap && <MapStats beatSaver={beatSaverMap} />}
            </div>

            {/* Selected Mode */}
            {selectedMode.name === "Overview" && (
              <ScoreOverview leaderboard={leaderboard} scoreStats={dropdownData.scoreStats} />
            )}
            {selectedMode.name === "Score History" && (
              <ScoreHistory playerId={score.playerId} leaderboard={leaderboard} />
            )}

            <Separator />

            {/* Scores */}
            <LeaderboardScores
              initialPage={scoresPage}
              leaderboard={leaderboard}
              highlightedPlayer={highlightedPlayer}
              disableUrlChanging
            />
          </Card>
        </motion.div>
      )}
    </div>
  );
}
