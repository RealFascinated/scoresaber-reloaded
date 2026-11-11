"use client";

import { cn } from "@/common/utils";
import Avatar from "@/components/avatar";
import CountrySelector from "@/components/country-selector";
import ScoreSaberScoreDisplay from "@/components/platform/scoresaber/score/scoresaber-score";
import ScoresListPanel from "@/components/platform/shared/scores-list-panel";
import { useLeaderboardFilter } from "@/components/providers/leaderboard/leaderboard-filter-provider";
import { ScoreModeEnum } from "@/components/score/score-mode-switcher";
import SimpleLink from "@/components/simple-link";
import { Spinner } from "@/components/spinner";
import { EmptyState } from "@/components/ui/empty-state";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useIsMobile } from "@/contexts/viewport-context";
import { useLeaderboardScores } from "@/hooks/score/use-leaderboard-scores";
import { useMainPlayer } from "@/hooks/use-main-player";
import { SharedIcons } from "@/shared-icons";
import { ScoreSaberLeaderboardDifficulty } from "@ssr/common/schemas/scoresaber/leaderboard/difficulty";
import { ScoreSaberLeaderboard } from "@ssr/common/schemas/scoresaber/leaderboard/leaderboard";
import { ScoreSaberScore } from "@ssr/common/schemas/scoresaber/score/score";
import { getDifficulty, getDifficultyName } from "@ssr/common/utils/song-utils";
import { useRouter } from "next/navigation";
import { useQueryState } from "nuqs";
import SimplePagination from "../../../simple-pagination";
import ScoreSaberLeaderboardScore from "../score/leaderboard-score";
import { leaderboardScoresSearchParams, type LeaderboardScoresInitialData } from "./leaderboard-scores-query";

function getScoreId(score: ScoreSaberScore) {
  return score.scoreId + "-" + score.timestamp;
}

function LeaderboardDifficultySelect({
  difficulties,
  current,
}: {
  difficulties: ScoreSaberLeaderboardDifficulty[];
  current: ScoreSaberLeaderboardDifficulty;
}) {
  const router = useRouter();
  const currentId = current.id;

  // Group difficulties by characteristic, making sure the current one is always present
  const allDifficulties = difficulties.some(d => d.id === currentId)
    ? difficulties
    : [current, ...difficulties];
  const groups = new Map<string, ScoreSaberLeaderboardDifficulty[]>();
  for (const d of allDifficulties) {
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
    value: ScoreModeEnum.Following,
    label: "Following",
    icon: <SharedIcons.FollowingScoresModeIcon className="h-4 w-4" />,
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

type LeaderboardScoresProps = {
  leaderboard: ScoreSaberLeaderboard;
  /** Global scores rendered on the server, used until the client has data of its own. */
  initialScores?: LeaderboardScoresInitialData;
};

export default function LeaderboardScores({ leaderboard, initialScores }: LeaderboardScoresProps) {
  const mainPlayer = useMainPlayer().data;
  const filter = useLeaderboardFilter();

  const [mode, setMode] = useQueryState("mode", leaderboardScoresSearchParams.mode);
  const [page, setPage] = useQueryState("page", leaderboardScoresSearchParams.page);
  const [highlight] = useQueryState("highlight");
  const isMobile = useIsMobile();
  const {
    data: scores,
    isError,
    isLoading,
    isRefetching,
  } = useLeaderboardScores(
    leaderboard.id,
    mainPlayer?.id ?? "",
    page,
    mode,
    filter.country ?? undefined,
    initialScores
  );

  const isFollowing = mode === ScoreModeEnum.Following;
  const noScores =
    isError || (!isLoading && !isRefetching && (!scores || (scores && scores.items.length === 0)));

  return (
    <div className="flex w-full flex-col gap-4">
      <div className="flex w-full flex-wrap items-center gap-2 sm:flex-nowrap">
        <LeaderboardDifficultySelect
          difficulties={leaderboard.difficulties}
          current={leaderboard.difficulty}
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

      {isMobile ? (
        <div className="ring-border bg-card flex flex-col gap-2 overflow-hidden rounded-xl px-2 pb-2 ring-1">
          <ScoresListPanel
            page={page}
            data={scores}
            isLoading={isLoading}
            isRefetching={isRefetching}
            isError={isError}
            generatePageUrl={page => `/leaderboard/${leaderboard.id}?page=${page}`}
            onPageChange={setPage}
            getKey={getScoreId}
            renderItem={playerScore => (
              <div className={cn(highlight === playerScore.playerId && "bg-primary/10")}>
                <div className="flex items-center gap-2 px-2 pt-2">
                  <Avatar
                    src={playerScore.playerInfo?.avatar ?? ""}
                    alt={`${playerScore.playerInfo?.name ?? "Unknown"}'s Profile Picture`}
                    size={20}
                    className="shrink-0"
                  />
                  {playerScore.playerInfo ? (
                    <SimpleLink
                      href={`/player/${playerScore.playerId}`}
                      className="hover:text-primary text-sm font-medium transition-colors"
                    >
                      {playerScore.playerInfo.name}
                    </SimpleLink>
                  ) : (
                    <p className="text-muted-foreground text-sm">Unknown Player</p>
                  )}
                </div>
                <ScoreSaberScoreDisplay score={playerScore} leaderboard={leaderboard} />
              </div>
            )}
          />
        </div>
      ) : isLoading && !scores ? (
        <div className="flex items-center justify-center py-12">
          <Spinner size="lg" />
        </div>
      ) : (
        <>
          <div className="ring-border bg-card overflow-hidden rounded-xl ring-1">
            <Table className="min-w-[800px]">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">Rank</TableHead>
                  <TableHead>Player</TableHead>
                  <TableHead className="text-center">Date Set</TableHead>
                  <TableHead className="text-center">Accuracy</TableHead>
                  <TableHead className="text-center">Misses</TableHead>
                  <TableHead className="text-center">{leaderboard.stars > 0 ? "PP" : "Score"}</TableHead>
                  <TableHead className="text-center">Mods</TableHead>
                  <TableHead className="w-10"></TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {noScores ? (
                  <TableRow className="hover:bg-transparent">
                    <TableCell colSpan={10} className="text-center">
                      <EmptyState
                        title="No Scores Found"
                        description={
                          isFollowing
                            ? "You or the players you follow haven't played this map yet"
                            : "No scores were found on this leaderboard or page"
                        }
                      />
                    </TableCell>
                  </TableRow>
                ) : (
                  scores?.items.map(playerScore => (
                    <ScoreSaberLeaderboardScore
                      key={getScoreId(playerScore)}
                      score={playerScore}
                      leaderboard={leaderboard}
                      highlightedPlayerId={highlight ?? undefined}
                    />
                  ))
                )}
              </TableBody>
            </Table>
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
