"use client";

import { cn } from "@/common/utils";
import { useLeaderboardFilter } from "@/components/providers/leaderboard/leaderboard-filter-provider";
import ScoreModeSwitcher, { ScoreModeEnum } from "@/components/score/score-mode-switcher";
import { EmptyState } from "@/components/ui/empty-state";
import { useIsMobile } from "@/contexts/viewport-context";
import { useLeaderboardScores } from "@/hooks/score/use-leaderboard-scores";
import useDatabase from "@/hooks/use-database";
import usePageNavigation from "@/hooks/use-page-navigation";
import ScoreSaberLeaderboard from "@ssr/common/model/leaderboard/impl/scoresaber-leaderboard";
import { ScoreSaberScore } from "@ssr/common/model/score/impl/scoresaber-score";
import { BeatSaverMapResponse } from "@ssr/common/response/beatsaver-map-response";
import { buildSearchParams } from "@ssr/common/utils/search-params";
import { useLiveQuery } from "dexie-react-hooks";
import { AnimatePresence, motion } from "framer-motion";
import React, { useCallback, useEffect, useState } from "react";
import { DifficultyButton } from "../../../leaderboard/button/difficulty-button";
import SimplePagination from "../../../simple-pagination";
import ScoreSaberLeaderboardScore from "../score/leaderboard-score";
import ScoreDropdown from "../score/score-dropdown";

function getScoreId(score: ScoreSaberScore) {
  return score.scoreId + "-" + score.timestamp;
}

export default function LeaderboardScores({
  initialPage = 1,
  initialCategory = ScoreModeEnum.Global,
  leaderboard,
  beatSaver,
  showDifficulties,
  isLeaderboardPage,
  leaderboardChanged,
  disableUrlChanging,
  highlightedPlayerId,
  historyPlayerId,
}: {
  initialPage?: number;
  initialCategory?: ScoreModeEnum;
  leaderboard: ScoreSaberLeaderboard;
  beatSaver?: BeatSaverMapResponse;
  showDifficulties?: boolean;
  isLeaderboardPage?: boolean;
  leaderboardChanged?: (id: number) => void;
  disableUrlChanging?: boolean;
  highlightedPlayerId?: string;
  historyPlayerId?: string;
}) {
  const { changePageUrl } = usePageNavigation();
  const isMobile = useIsMobile();
  const database = useDatabase();
  const mainPlayerId = useLiveQuery(() => database.getMainPlayerId());
  const filter = useLeaderboardFilter();

  const [mode, setMode] = useState<ScoreModeEnum>(initialCategory);
  const [leaderboardId, setLeaderboardId] = useState(leaderboard.id);
  const [page, setPage] = useState(initialPage);
  const [expandedScoreId, setExpandedScoreId] = useState<string | null>(null);

  const {
    data: scores,
    isError,
    isLoading,
    isRefetching,
  } = useLeaderboardScores(
    leaderboardId,
    historyPlayerId ?? mainPlayerId ?? "",
    page,
    mode,
    filter.country
  );

  const handleLeaderboardChange = useCallback(
    (id: number) => {
      setLeaderboardId(id);
      setPage(1);
      leaderboardChanged?.(id);
    },
    [leaderboardChanged]
  );

  const handleDropdownToggle = useCallback(
    (score: ScoreSaberScore) => {
      const scoreId = getScoreId(score);
      setExpandedScoreId(expandedScoreId === scoreId ? null : scoreId);
    },
    [expandedScoreId]
  );

  const handleModeChange = useCallback((newMode: ScoreModeEnum) => {
    setMode(newMode);
    setPage(1);
  }, []);

  const handlePageChange = useCallback((newPage: number) => {
    setPage(newPage);
  }, []);

  const generatePageUrl = useCallback(
    (page: number) => {
      return `/leaderboard/${leaderboardId}/${page}`;
    },
    [leaderboardId]
  );

  useEffect(() => {
    setPage(1);
  }, [filter.country]);

  useEffect(() => {
    if (disableUrlChanging) {
      return;
    }

    changePageUrl(
      `/leaderboard/${leaderboardId}${page !== 1 ? `/${page}` : ""}?${buildSearchParams({ category: mode === ScoreModeEnum.Global ? undefined : mode, country: filter.country ?? undefined })}`
    );
  }, [leaderboardId, page, disableUrlChanging, changePageUrl, mode, filter.country]);

  const isFriends = mode === ScoreModeEnum.Friends;

  return (
    <div className="flex flex-col gap-2">
      <div
        className={cn(
          "flex flex-col flex-wrap items-center justify-center gap-4 sm:flex-row",
          isLeaderboardPage && "sm:justify-between"
        )}
      >
        <ScoreModeSwitcher initialMode={mode} onModeChange={handleModeChange} />

        {showDifficulties && (
          <div className="bg-background/80 border-border/50 flex flex-wrap justify-center gap-1.5 rounded-lg border p-1.5 shadow-sm">
            {leaderboard.difficulties.map((difficultyData, index) => (
              <DifficultyButton
                key={index}
                {...difficultyData}
                selectedId={leaderboardId}
                onSelect={handleLeaderboardChange}
                inGameDifficulty={
                  beatSaver?.difficultyLabels?.[difficultyData.difficulty] ?? undefined
                }
              />
            ))}
          </div>
        )}
      </div>

      {(isError ||
        (!isLoading && !isRefetching && (!scores || (scores && scores.items.length === 0)))) && (
        <EmptyState
          title="No Scores Found"
          description={
            isFriends
              ? "You or your friends haven't played this map yet"
              : "No scores were found on this leaderboard or page"
          }
        />
      )}

      {scores && scores.items.length > 0 && (
        <>
          <div className="border-border/50 bg-background/50 relative overflow-x-auto rounded-lg border shadow-sm">
            <table className="table w-full min-w-[800px] table-auto border-spacing-0 text-left text-sm">
              <thead>
                <tr className="border-border/50 bg-muted/30 border-b">
                  <th className="text-foreground/90 px-3 py-3 font-semibold">Rank</th>
                  <th className="text-foreground/90 px-3 py-3 font-semibold">Player</th>
                  <th className="text-foreground/90 px-3 py-3 text-center font-semibold">
                    Time Set
                  </th>
                  <th className="text-foreground/90 px-3 py-3 text-center font-semibold">
                    Accuracy
                  </th>
                  <th className="text-foreground/90 px-3 py-3 text-center font-semibold">Misses</th>
                  <th className="text-foreground/90 px-3 py-3 text-center font-semibold">
                    {leaderboard.stars > 0 ? "PP" : "Score"}
                  </th>
                  <th className="text-foreground/90 px-3 py-3 text-center font-semibold">Mods</th>
                  <th className="text-foreground/90 w-[28px] px-3 py-3 text-center font-semibold">
                    Replay
                  </th>
                  <th className="text-foreground/90 w-[32px] px-3 py-3 text-center font-semibold">
                    Details
                  </th>
                </tr>
              </thead>
              <tbody className="divide-border/50 divide-y">
                {scores.items.map(playerScore => (
                  <React.Fragment key={playerScore.scoreId}>
                    <tr
                      className={cn(
                        "hover:bg-muted/30 transition-colors duration-200",
                        highlightedPlayerId === playerScore.playerId && "bg-primary/10"
                      )}
                    >
                      <ScoreSaberLeaderboardScore
                        score={playerScore}
                        leaderboard={leaderboard}
                        highlightedPlayerId={highlightedPlayerId}
                        showDropdown
                        onDropdownToggle={() => handleDropdownToggle(playerScore)}
                      />
                    </tr>

                    {/* Dropdown row - appears directly below the clicked row */}
                    <AnimatePresence>
                      {expandedScoreId === getScoreId(playerScore) && (
                        <motion.tr
                          key={`dropdown-${getScoreId(playerScore)}`}
                          className="origin-top border-none"
                          initial={{ opacity: 0, height: 0, scale: 0.95 }}
                          animate={{ opacity: 1, height: "auto", scale: 1 }}
                          exit={{ opacity: 0, height: 0, scale: 0.95 }}
                          transition={{
                            duration: 0.3,
                            ease: [0.4, 0, 0.2, 1],
                            height: { duration: 0.3 },
                            opacity: { duration: 0.2 },
                          }}
                        >
                          <td colSpan={10} className="p-0">
                            <div className="bg-muted/20 px-4 py-3">
                              <ScoreDropdown
                                score={playerScore}
                                leaderboard={leaderboard}
                                beatSaverMap={beatSaver}
                                highlightedPlayerId={highlightedPlayerId}
                                isExpanded={true}
                                showLeaderboardScores={false}
                                showMapStats={false}
                              />
                            </div>
                          </td>
                        </motion.tr>
                      )}
                    </AnimatePresence>
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>

          <SimplePagination
            mobilePagination={isMobile}
            page={page}
            totalItems={scores.metadata.totalItems}
            itemsPerPage={scores.metadata.itemsPerPage}
            loadingPage={isLoading || isRefetching ? page : undefined}
            generatePageUrl={generatePageUrl}
            onPageChange={handlePageChange}
          />
        </>
      )}
    </div>
  );
}
