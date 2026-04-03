"use client";

import { useLeaderboardFilter } from "@/components/providers/leaderboard/leaderboard-filter-provider";
import ScoreModeSwitcher, { ScoreModeEnum } from "@/components/score/score-mode-switcher";
import { Spinner } from "@/components/spinner";
import { EmptyState } from "@/components/ui/empty-state";
import { useIsMobile } from "@/contexts/viewport-context";
import { useLeaderboardScores } from "@/hooks/score/use-leaderboard-scores";
import useDatabase from "@/hooks/use-database";
import { useStableLiveQuery } from "@/hooks/use-stable-live-query";
import { MapCharacteristicBase } from "@ssr/common/schemas/map/map-characteristic";
import { ScoreSaberLeaderboard } from "@ssr/common/schemas/scoresaber/leaderboard/leaderboard";
import { ScoreSaberScore } from "@ssr/common/schemas/scoresaber/score/score";
import { parseAsInteger, parseAsStringLiteral, useQueryState } from "nuqs";
import { useEffect } from "react";
import Card from "../../../card";
import { CharacteristicButton } from "../../../leaderboard/button/characteristic-button";
import { DifficultyButton } from "../../../leaderboard/button/difficulty-button";
import SimplePagination from "../../../simple-pagination";
import ScoreSaberLeaderboardScore from "../score/leaderboard-score";

function getScoreId(score: ScoreSaberScore) {
  return score.scoreId + "-" + score.timestamp;
}

const CHARACTERISTICS: MapCharacteristicBase[] = [
  "Standard",
  "OneSaber",
  "NoArrows",
  "Lawless",
  "90Degree",
  "360Degree",
  "Lightshow",
  "Legacy",
  "MissingCharacteristic",
];

export default function LeaderboardScores({ leaderboard }: { leaderboard: ScoreSaberLeaderboard }) {
  const isMobile = useIsMobile();
  const database = useDatabase();
  const mainPlayerId = useStableLiveQuery(() => database.getMainPlayerId());
  const filter = useLeaderboardFilter();

  const [mode, setMode] = useQueryState(
    "mode",
    parseAsStringLiteral<ScoreModeEnum>(Object.values(ScoreModeEnum)).withDefault(ScoreModeEnum.Global)
  );
  const [page, setPage] = useQueryState("page", parseAsInteger.withDefault(1));

  const {
    data: scores,
    isError,
    isLoading,
    isRefetching,
  } = useLeaderboardScores(leaderboard.id, mainPlayerId ?? "", page, mode, filter.country ?? undefined);

  useEffect(() => {
    setPage(1);
  }, [filter.country]);

  const isFriends = mode === ScoreModeEnum.Friends;
  const noScores =
    isError || (!isLoading && !isRefetching && (!scores || (scores && scores.items.length === 0)));

  const currentCharacteristic = leaderboard.difficulties.find(
    difficulty => difficulty.characteristic === leaderboard.difficulty.characteristic
  )!.characteristic;

  const characteristics = [
    ...new Set(
      leaderboard.difficulties
        .filter(difficulty => CHARACTERISTICS.includes(difficulty.characteristic as MapCharacteristicBase))
        .map(difficulty => difficulty.characteristic)
    ),
  ];

  return (
    <div>
      <div className="flex justify-between gap-(--spacing-md)">
        <div className="flex flex-row">
          {leaderboard.difficulties
            .filter(difficulty => difficulty.characteristic === currentCharacteristic)
            .map(difficulty => (
              <DifficultyButton
                key={difficulty.id}
                selectedId={leaderboard.difficulty.id}
                leaderboardDifficulty={difficulty}
              />
            ))}
        </div>

        <div className="flex flex-row gap-(--spacing-md)">
          {characteristics.map(characteristic => (
            <CharacteristicButton
              key={characteristic}
              leaderboardId={leaderboard.id}
              selectedCharacteristic={currentCharacteristic}
              characteristic={characteristic}
            />
          ))}
        </div>
      </div>

      <Card className="relative w-full gap-(--spacing-md) rounded-t-none">
        <div className={"flex flex-col flex-wrap items-center justify-center gap-4 sm:flex-row"}>
          <ScoreModeSwitcher initialMode={mode} onModeChange={setMode} />
        </div>

        {isLoading && !scores ? (
          <div className="flex items-center justify-center py-12">
            <Spinner size="lg" />
          </div>
        ) : (
          <>
            <div className="border-border bg-background/50 relative overflow-x-auto rounded-lg border">
              <table className="table w-full min-w-[800px] table-auto border-spacing-0 text-left text-sm">
                <thead>
                  <tr className="border-border bg-muted/30 border-b">
                    <th className="text-foreground/90 px-3 py-3 font-semibold">Rank</th>
                    <th className="text-foreground/90 px-3 py-3 font-semibold">Player</th>
                    <th className="text-foreground/90 px-3 py-3 text-center font-semibold">Date Set</th>
                    <th className="text-foreground/90 px-3 py-3 text-center font-semibold">Accuracy</th>
                    <th className="text-foreground/90 px-3 py-3 text-center font-semibold">Misses</th>
                    <th className="text-foreground/90 px-3 py-3 text-center font-semibold">
                      {leaderboard.stars > 0 ? "PP" : "Score"}
                    </th>
                    <th className="text-foreground/90 px-3 py-3 text-center font-semibold">Mods</th>
                    <th></th>
                    <th></th>
                  </tr>
                </thead>

                {noScores && (
                  <tbody className="text-center">
                    <tr>
                      <td colSpan={10}>
                        <EmptyState
                          title="No Scores Found"
                          description={
                            isFriends
                              ? "You or your friends haven't played this map yet"
                              : "No scores were found on this leaderboard or page"
                          }
                        />
                      </td>
                    </tr>
                  </tbody>
                )}

                {scores &&
                  scores.items.length > 0 &&
                  scores.items.map(playerScore => (
                    <ScoreSaberLeaderboardScore
                      key={getScoreId(playerScore)}
                      score={playerScore}
                      leaderboard={leaderboard}
                    />
                  ))}
              </table>
            </div>

            {scores && scores.items.length > 0 && (
              <SimplePagination
                mobilePagination={isMobile}
                page={page}
                totalItems={scores.metadata.totalItems}
                itemsPerPage={scores.metadata.itemsPerPage}
                loadingPage={isLoading || isRefetching ? page : undefined}
                onPageChange={setPage}
                generatePageUrl={page => `/leaderboard/${leaderboard.id}?page=${page}`}
              />
            )}
          </>
        )}
      </Card>
    </div>
  );
}
