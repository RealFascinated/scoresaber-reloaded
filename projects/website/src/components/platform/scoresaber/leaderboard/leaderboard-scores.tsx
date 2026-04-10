"use client";

import { useLeaderboardFilter } from "@/components/providers/leaderboard/leaderboard-filter-provider";
import ScoreModeSwitcher, { ScoreModeEnum } from "@/components/score/score-mode-switcher";
import { Spinner } from "@/components/spinner";
import { EmptyState } from "@/components/ui/empty-state";
import { useLeaderboardScores } from "@/hooks/score/use-leaderboard-scores";
import useDatabase from "@/hooks/use-database";
import { useStableLiveQuery } from "@/hooks/use-stable-live-query";
import { FilterItem } from "@ssr/common/filter-item";
import { MapCharacteristic } from "@ssr/common/schemas/map/map-characteristic";
import { ScoreSaberLeaderboard } from "@ssr/common/schemas/scoresaber/leaderboard/leaderboard";
import { ScoreSaberScore } from "@ssr/common/schemas/scoresaber/score/score";
import { countryFilter } from "@ssr/common/utils/country.util";
import { getDifficulty } from "@ssr/common/utils/song-utils";
import { parseAsInteger, parseAsStringLiteral, useQueryState } from "nuqs";
import Card from "../../../card";
import { CharacteristicButton } from "../../../leaderboard/button/characteristic-button";
import { DifficultyButton } from "../../../leaderboard/button/difficulty-button";
import SimplePagination from "../../../simple-pagination";
import Combobox from "../../../ui/combo-box";
import CountryFlag from "../../../ui/country-flag";
import ScoreSaberLeaderboardScore from "../score/leaderboard-score";

function getScoreId(score: ScoreSaberScore) {
  return score.scoreId + "-" + score.timestamp;
}

const SHOWN_CHARACTERISTICS: MapCharacteristic[] = [
  "Standard",
  "OneSaber",
  "NoArrows",
  "Lawless",
  "90Degree",
  "360Degree",
  "Lightshow",
];

export default function LeaderboardScores({ leaderboard }: { leaderboard: ScoreSaberLeaderboard }) {
  const database = useDatabase();
  const mainPlayer = useStableLiveQuery(() => database.getMainPlayer());
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
  } = useLeaderboardScores(leaderboard.id, mainPlayer?.id ?? "", page, mode, filter.country ?? undefined);

  const isFriends = mode === ScoreModeEnum.Friends;
  const noScores =
    isError || (!isLoading && !isRefetching && (!scores || (scores && scores.items.length === 0)));

  const currentCharacteristic = leaderboard.difficulties.find(
    difficulty => difficulty.characteristic === leaderboard.difficulty.characteristic
  )!.characteristic;

  const seenCharacteristics = new Set<MapCharacteristic>();
  const characteristicLeaderboards = leaderboard.difficulties.filter(difficulty => {
    if (
      seenCharacteristics.has(difficulty.characteristic) ||
      !SHOWN_CHARACTERISTICS.includes(difficulty.characteristic)
    ) {
      return false;
    }
    seenCharacteristics.add(difficulty.characteristic);
    return true;
  });

  const difficultyColor = getDifficulty(leaderboard.difficulty.difficulty).color;

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

        <div className="flex flex-row">
          {characteristicLeaderboards.map(leaderboardDifficulty => (
            <CharacteristicButton
              key={leaderboardDifficulty.id}
              leaderboardDifficulty={leaderboardDifficulty}
              selectedLeaderboardDifficulty={leaderboard.difficulty}
            />
          ))}
        </div>
      </div>

      <Card
        className="relative w-full gap-(--spacing-md) rounded-t-none border-2"
        style={{
          borderColor: difficultyColor,
        }}
      >
        <div className="flex w-full flex-col items-center gap-4 sm:flex-row sm:items-center">
          {/* Equal flex-1 gutters keep ScoreModeSwitcher on the true horizontal center (sm+). */}
          <div className="hidden min-w-0 sm:block sm:flex-1" aria-hidden />
          <div className="flex shrink-0 justify-center">
            <ScoreModeSwitcher initialMode={mode} onModeChange={setMode} />
          </div>
          <div className="flex w-full min-w-0 justify-center sm:flex-1 sm:justify-end">
            {/* Country Filter */}
            <Combobox<string | undefined>
              className="w-full max-w-72"
              clearable
              items={countryFilter
                .map(({ key, friendlyName }: FilterItem) => ({
                  value: key,
                  name: friendlyName,
                  icon: <CountryFlag code={key} size={14} />,
                }))
                // The top country is the country of the claimed player
                .sort((country: { value: string }) => {
                  if (country.value === mainPlayer?.country) {
                    return -1;
                  }
                  return 1;
                })}
              value={filter.country}
              onValueChange={newCountry => {
                filter.setCountry(newCountry);
                setPage(1);
              }}
              placeholder="All countries"
            />
          </div>
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
                    <th className="text-foreground/90 py-3 pr-1 pl-3 font-semibold">Rank</th>
                    <th className="text-foreground/90 px-1 py-3 font-semibold">Player</th>
                    <th className="text-foreground/90 px-1 py-3 text-center font-semibold">Date Set</th>
                    <th className="text-foreground/90 px-1 py-3 text-center font-semibold">Accuracy</th>
                    <th className="text-foreground/90 px-1 py-3 text-center font-semibold">Misses</th>
                    <th className="text-foreground/90 px-1 py-3 text-center font-semibold">
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
