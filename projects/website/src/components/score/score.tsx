"use client";

import Card from "@/components/card";
import { MapStats } from "@/components/score/map-stats";
import { ScoreHistory } from "@/components/score/score-views/score-history";
import { ScoreOverview } from "@/components/score/score-views/score-overview";
import { Button } from "@/components/ui/button";
import { CubeIcon } from "@heroicons/react/24/solid";
import { useQuery } from "@tanstack/react-query";
import { TrendingUpIcon } from "lucide-react";
import { ReactElement, useCallback, useEffect, useMemo, useState } from "react";
import ScoreButtons from "./score-buttons";
import ScoreInfo from "./score-info";
import ScoreSongInfo from "./score-song-info";
import ScoreStats from "./score-stats";

import { useIsMobile } from "@/hooks/use-is-mobile";
import { getPageFromRank } from "@ssr/common/utils/utils";

import LeaderboardScores from "@/components/leaderboard/leaderboard-scores";
import { Separator } from "@/components/ui/separator";
import ApiServiceRegistry from "@ssr/common/api-service/api-service-registry";
import ScoreSaberLeaderboard from "@ssr/common/model/leaderboard/impl/scoresaber-leaderboard";
import { ScoreSaberScore } from "@ssr/common/model/score/impl/scoresaber-score";
import { BeatSaverMapResponse } from "@ssr/common/response/beatsaver-map-response";
import { ScoreStatsResponse } from "@ssr/common/response/scorestats-response";
import { ScoreSaberLeaderboardPlayerInfoToken } from "@ssr/common/types/token/scoresaber/leaderboard-player-info";
import { getScoreSaberAvatar } from "@ssr/common/utils/scoresaber.util";
import { ssrApi } from "@ssr/common/utils/ssr-api";
import Link from "next/link";
import Avatar from "../avatar";

type Props = {
  highlightedPlayerId?: string;
  score: ScoreSaberScore;
  leaderboard: ScoreSaberLeaderboard;
  beatSaverMap?: BeatSaverMapResponse;
  playerAbove?: ScoreSaberLeaderboardPlayerInfoToken;
  settings?: {
    noScoreButtons?: boolean;
    hideLeaderboardDropdown?: boolean;
    hideAccuracyChanger?: boolean;
    disablePadding?: boolean;
    hideRank?: boolean;
    allowLeaderboardPreview?: boolean;
  };
};

type DropdownData = {
  scoreStats?: ScoreStatsResponse;
};

type Mode = {
  name: string;
  icon: ReactElement<any>;
};

const modes: Mode[] = [
  { name: "Overview", icon: <CubeIcon className="w-4 h-4" /> },
  { name: "Score History", icon: <TrendingUpIcon className="w-4 h-4" /> },
];

export default function Score({
  leaderboard,
  beatSaverMap,
  score,
  settings,
  highlightedPlayerId,
  playerAbove,
}: Props) {
  const [baseScore, setBaseScore] = useState(score.score);
  const [isLeaderboardExpanded, setIsLeaderboardExpanded] = useState(false);
  const [selectedMode, setSelectedMode] = useState<Mode>(modes[0]);

  const scoresPage = useMemo(() => getPageFromRank(score.rank, 12), [score.rank]);
  const isMobile = useIsMobile();

  const { data: dropdownData, isLoading } = useQuery<DropdownData>({
    queryKey: [
      `leaderboardDropdownData:${leaderboard.id}`,
      leaderboard.id,
      score.scoreId,
      isLeaderboardExpanded,
    ],
    queryFn: async () => {
      return {
        scoreStats: score.additionalData
          ? await ssrApi.fetchScoreStats(score.additionalData.scoreId)
          : undefined,
      };
    },
    staleTime: 30000,
    enabled: isLeaderboardExpanded,
  });

  useEffect(() => {
    setIsLeaderboardExpanded(false);
    setSelectedMode(modes[0]);
  }, [score.scoreId]);

  useEffect(() => {
    setBaseScore(score.score);
  }, [score]);

  const accuracy = useMemo(
    () => (baseScore / leaderboard.maxScore) * 100,
    [baseScore, leaderboard.maxScore]
  );
  const pp = useMemo(
    () =>
      baseScore === score.score
        ? score.pp
        : ApiServiceRegistry.getInstance()
            .getScoreSaberService()
            .getPp(leaderboard.stars, accuracy),
    [baseScore, score.score, score.pp, leaderboard.stars, accuracy]
  );

  const handleLeaderboardOpen = useCallback((isExpanded: boolean) => {
    if (!isExpanded) {
      setSelectedMode(modes[0]);
    }
    setIsLeaderboardExpanded(isExpanded);
  }, []);

  const handleModeChange = useCallback((mode: Mode) => {
    setSelectedMode(mode);
  }, []);

  const gridColsClass = useMemo(
    () =>
      settings?.noScoreButtons
        ? "grid-cols-[20px_1fr_1fr] lg:grid-cols-[0.5fr_4fr_350px]"
        : "grid-cols-[20px_1fr_1fr] lg:grid-cols-[0.5fr_4fr_1fr_350px]",
    [settings?.noScoreButtons]
  );

  const memoizedScore = useMemo(() => ({ ...score, accuracy, pp }), [score, accuracy, pp]);

  return (
    <div className={`${settings?.disablePadding ? "" : "pb-2 pt-2"}`}>
      {playerAbove && (
        <div className="flex items-center gap-2 pl-2">
          <Avatar src={getScoreSaberAvatar(playerAbove)} alt={playerAbove.name ?? ""} size={20} />
          <Link
            href={`/player/${playerAbove.id}`}
            className="hover:brightness-[66%] transition-all cursor-pointer"
            prefetch={false}
          >
            <p className="text-sm">{playerAbove.name}</p>
          </Link>
        </div>
      )}
      <div
        className={`grid w-full gap-2 lg:gap-0 ${gridColsClass} ${settings?.hideRank ? "pt-1" : ""}`}
      >
        <ScoreInfo score={score} leaderboard={leaderboard} hideRank={settings?.hideRank} />

        <ScoreSongInfo
          leaderboard={leaderboard}
          beatSaverMap={beatSaverMap}
          allowLeaderboardPreview={settings?.allowLeaderboardPreview && !isMobile}
        />

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

        <ScoreStats score={memoizedScore} leaderboard={leaderboard} />
      </div>

      {isLeaderboardExpanded && dropdownData && !isLoading && (
        <div className="w-full mt-2">
          <Card className="flex gap-4 w-full relative border border-input">
            <div className="flex flex-col w-full gap-2 justify-center items-center">
              <div className="flex flex-wrap justify-center lg:justify-start gap-2">
                {modes.map(mode => (
                  <Button
                    key={mode.name}
                    variant={mode.name === selectedMode.name ? "default" : "outline"}
                    onClick={() => handleModeChange(mode)}
                    className="flex gap-2"
                  >
                    {mode.icon}
                    <p>{mode.name}</p>
                  </Button>
                ))}
              </div>

              {beatSaverMap && <MapStats beatSaver={beatSaverMap} />}
            </div>

            {selectedMode.name === "Overview" ? (
              <ScoreOverview leaderboard={leaderboard} scoreStats={dropdownData.scoreStats} />
            ) : (
              <ScoreHistory playerId={score.playerId} leaderboard={leaderboard} />
            )}

            <Separator />

            <LeaderboardScores
              initialPage={scoresPage}
              leaderboard={leaderboard}
              highlightedPlayerId={highlightedPlayerId}
              disableUrlChanging
            />
          </Card>
        </div>
      )}
    </div>
  );
}
