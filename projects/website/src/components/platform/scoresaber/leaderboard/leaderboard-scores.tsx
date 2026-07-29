"use client";

import CountrySelector from "@/components/country-selector";
import { useLeaderboardFilter } from "@/components/providers/leaderboard/leaderboard-filter-provider";
import { ScoreModeEnum } from "@/components/score/score-mode-switcher";
import { Spinner } from "@/components/spinner";
import { EmptyState } from "@/components/ui/empty-state";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useLeaderboardScores } from "@/hooks/score/use-leaderboard-scores";
import useDatabase from "@/hooks/use-database";
import { useStableLiveQuery } from "@/hooks/use-stable-live-query";
import { SharedIcons } from "@/shared-icons";
import { ScoreSaberLeaderboardDifficulty } from "@ssr/common/schemas/scoresaber/leaderboard/difficulty";
import { ScoreSaberLeaderboard } from "@ssr/common/schemas/scoresaber/leaderboard/leaderboard";
import { ScoreSaberScore } from "@ssr/common/schemas/scoresaber/score/score";
import { getDifficulty, getDifficultyName } from "@ssr/common/utils/song-utils";
import { useRouter } from "next/navigation";
import { parseAsInteger, parseAsStringLiteral, useQueryState } from "nuqs";
import SimplePagination from "../../../simple-pagination";
import ScoreSaberLeaderboardScore from "../score/leaderboard-score";

function getScoreId(score: ScoreSaberScore) {
  return score.scoreId + "-" + score.timestamp;
}

function LeaderboardDifficultySelect({
  difficulties,
  currentId,
}: {
  difficulties: ScoreSaberLeaderboardDifficulty[];
  currentId: number;
}) {
  const router = useRouter();

  // Group difficulties by characteristic
  const groups = new Map<string, ScoreSaberLeaderboardDifficulty[]>();
  for (const d of difficulties) {
    const group = groups.get(d.characteristic) ?? [];
    group.push(d);
    groups.set(d.characteristic, group);
  }

  // Order characteristics by display preference
  const characteristicOrder = [
    "Standard",
    "OneSaber",
    "NoArrows",
    "90Degree",
    "360Degree",
    "Lawless",
    "Lightshow",
  ];
  const sortedGroups = [...groups.entries()].sort(
    (a, b) => characteristicOrder.indexOf(a[0]) - characteristicOrder.indexOf(b[0])
  );

  const current = difficulties.find(d => d.id === currentId)!;

  return (
    <Select value={String(currentId)} onValueChange={value => router.push(`/leaderboard/${value}`)}>
      <SelectTrigger className="w-full sm:w-44">
        <SelectValue>
          <div className="flex items-center gap-2">
            <span
              className="inline-block size-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: getDifficulty(current.difficulty).color }}
            />
            <span className="text-sm">
              {current.characteristic === "Standard"
                ? getDifficultyName(current.difficulty)
                : `${current.characteristic} ${getDifficultyName(current.difficulty)}`}
            </span>
            {current.stars > 0 && (
              <span className="text-muted-foreground text-xs tabular-nums">{current.stars.toFixed(2)}★</span>
            )}
          </div>
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {sortedGroups.map(([characteristic, diffs]) => (
          <div key={characteristic}>
            <div className="text-muted-foreground px-2 py-1.5 text-xs font-semibold tracking-wider uppercase">
              {characteristic}
            </div>
            {diffs.map(d => {
              const diff = getDifficulty(d.difficulty);
              return (
                <SelectItem key={d.id} value={String(d.id)}>
                  <div className="flex items-center gap-2">
                    <span
                      className="inline-block size-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: diff.color }}
                    />
                    <span>{getDifficultyName(d.difficulty)}</span>
                    {d.stars > 0 && (
                      <span className="text-muted-foreground text-xs tabular-nums">
                        {d.stars.toFixed(2)}★
                      </span>
                    )}
                  </div>
                </SelectItem>
              );
            })}
          </div>
        ))}
      </SelectContent>
    </Select>
  );
}

const modeOptions = [
  {
    value: ScoreModeEnum.Global,
    label: "Global",
    icon: <SharedIcons.GlobalScoresModeIcon className="h-4 w-4" />,
  },
  {
    value: ScoreModeEnum.Friends,
    label: "Friends",
    icon: <SharedIcons.FriendsScoresModeIcon className="h-4 w-4" />,
  },
  {
    value: ScoreModeEnum.History,
    label: "History",
    icon: <SharedIcons.HistoryScoresModeIcon className="h-4 w-4" />,
  },
];

function LeaderboardModeSelect({
  mode,
  onModeChange,
}: {
  mode: ScoreModeEnum;
  onModeChange: (mode: ScoreModeEnum) => void;
}) {
  const current = modeOptions.find(o => o.value === mode) ?? modeOptions[0];

  return (
    <Select value={mode} onValueChange={value => onModeChange(value as ScoreModeEnum)}>
      <SelectTrigger className="w-full sm:w-36">
        <SelectValue>
          <div className="flex items-center gap-2">
            {current.icon}
            <span>{current.label}</span>
          </div>
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {modeOptions.map(option => (
          <SelectItem key={option.value} value={option.value}>
            <div className="flex items-center gap-2">
              {option.icon}
              <span>{option.label}</span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export default function LeaderboardScores({ leaderboard }: { leaderboard: ScoreSaberLeaderboard }) {
  const database = useDatabase();
  const mainPlayer = useStableLiveQuery(() => database.getMainPlayer());
  const filter = useLeaderboardFilter();

  const [mode, setMode] = useQueryState(
    "mode",
    parseAsStringLiteral<ScoreModeEnum>(Object.values(ScoreModeEnum)).withDefault(ScoreModeEnum.Global)
  );
  const [page, setPage] = useQueryState("page", parseAsInteger.withDefault(1));
  const [highlight] = useQueryState("highlight");
  const {
    data: scores,
    isError,
    isLoading,
    isRefetching,
  } = useLeaderboardScores(leaderboard.id, mainPlayer?.id ?? "", page, mode, filter.country ?? undefined);

  const isFriends = mode === ScoreModeEnum.Friends;
  const noScores =
    isError || (!isLoading && !isRefetching && (!scores || (scores && scores.items.length === 0)));

  return (
    <div className="flex w-full flex-col gap-4">
      {/* Difficulty / mode / country filter bar */}
      <div className="flex w-full flex-wrap items-center gap-2 sm:flex-nowrap">
        <LeaderboardDifficultySelect
          difficulties={leaderboard.difficulties}
          currentId={leaderboard.difficulty.id}
        />
        <LeaderboardModeSelect mode={mode} onModeChange={setMode} />
        <div className="min-w-0 flex-1 sm:max-w-56">
          <CountrySelector
            clearable
            prioritizeCountry={mainPlayer?.country}
            value={filter.country}
            onValueChange={newCountry => {
              filter.setCountry(newCountry);
              setPage(1);
            }}
            placeholder="All countries"
          />
        </div>
      </div>

      {/* Scores */}
      {isLoading && !scores ? (
        <div className="flex items-center justify-center py-12">
          <Spinner size="lg" />
        </div>
      ) : (
        <>
          <div className="ring-border relative overflow-x-auto rounded-xl ring-1">
            <table className="table w-full min-w-[800px] table-auto border-spacing-0 text-left text-sm">
              <thead>
                <tr className="border-border/50 border-b">
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
                    highlightedPlayerId={highlight ?? undefined}
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
    </div>
  );
}
