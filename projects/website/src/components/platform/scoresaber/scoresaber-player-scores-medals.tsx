"use client";

import HmdFilter from "@/components/platform/shared/hmd-filter";
import ScoreSortControl from "@/components/platform/shared/score-sort-control";
import ScoresListPanel from "@/components/platform/shared/scores-list-panel";
import SearchInput from "@/components/platform/shared/search-input";
import { usePlayerScoresQuery, type SortOption } from "@/components/platform/shared/use-player-scores-query";
import { SharedIcons } from "@/shared-icons";
import { HMD } from "@ssr/common/hmds";
import { Pagination } from "@ssr/common/pagination";
import ScoreSaberPlayer from "@ssr/common/player/impl/scoresaber-player";
import { PlayerScoresPageResponse } from "@ssr/common/schemas/response/score/player-scores";
import { ScoreSaberMedalScoreSortField } from "@ssr/common/schemas/score/query/sort/scoresaber-medal-scores-sort";
import { SortDirection } from "@ssr/common/schemas/score/query/sort/sort-direction";
import { ssrApi } from "@ssr/common/utils/ssr-api";
import { parseAsString, useQueryState } from "nuqs";
import ScoresCard from "../../score/scores-card";
import { ScoresToolbar } from "../../score/scores-toolbar";
import ScoreSaberScoreDisplay from "./score/scoresaber-score";

const DEFAULT_SORT: ScoreSaberMedalScoreSortField = "date";
const DEFAULT_SORT_DIRECTION: SortDirection = "desc";

const SORT_OPTIONS: SortOption<ScoreSaberMedalScoreSortField>[] = [
  {
    name: "Medals",
    value: "medals",
    icon: <SharedIcons.MedalsSortIcon className="h-4 w-4" />,
    defaultOrder: "desc",
  },
  {
    name: "Date",
    value: "date",
    icon: <SharedIcons.DateSortIcon className="h-4 w-4" />,
    defaultOrder: "desc",
  },
  {
    name: "Misses",
    value: "misses",
    icon: <SharedIcons.MissesSortIcon className="h-4 w-4" />,
    defaultOrder: "desc",
  },
  {
    name: "Accuracy",
    value: "acc",
    icon: <SharedIcons.AccuracySortIcon className="h-4 w-4" />,
    defaultOrder: "desc",
  },
  {
    name: "Score",
    value: "score",
    icon: <SharedIcons.ScoreValueSortIcon className="h-4 w-4" />,
    defaultOrder: "desc",
  },
  {
    name: "Max Combo",
    value: "maxcombo",
    icon: <SharedIcons.MaxComboSortIcon className="h-4 w-4" />,
    defaultOrder: "desc",
  },
];

export default function ScoreSaberPlayerMedalScores({ player }: { player: ScoreSaberPlayer }) {
  const [hmdFilter, setHmdFilter] = useQueryState("hmd", parseAsString) as [
    HMD | null,
    (value: HMD | null) => void,
  ];

  const query = usePlayerScoresQuery<ScoreSaberMedalScoreSortField, PlayerScoresPageResponse>({
    queryKeyPrefix: "playerScores:medals",
    playerId: player.id,
    playerName: player.name,
    titleLabel: "Medals",
    defaultSort: DEFAULT_SORT,
    sortOptions: SORT_OPTIONS,
    hasDirection: true,
    extraKeyParts: [hmdFilter],
    queryFn: async ({ page, sort, direction, search }) => {
      const response = await ssrApi.fetchPlayerScoreSaberMedalScores(player.id, page, sort, direction, {
        ...(search ? { search } : {}),
        ...(hmdFilter ? { hmd: hmdFilter } : {}),
      });
      return response || Pagination.empty();
    },
    buildUrl: (pageNum, { sort, direction, search }) => {
      const params = new URLSearchParams();
      params.set("platform", "medals");
      if (sort !== DEFAULT_SORT) {
        params.set("sort", sort);
      }
      if (direction !== DEFAULT_SORT_DIRECTION) {
        params.set("direction", direction);
      }
      if (pageNum !== 1) {
        params.set("page", String(pageNum));
      }
      if (search && search.length >= 3) {
        params.set("search", search);
      }
      if (hmdFilter) {
        params.set("hmd", hmdFilter);
      }
      return `/player/${player.id}?${params.toString()}`;
    },
  });

  return (
    <ScoresCard>
      <div className="flex w-full flex-col gap-3">
        <ScoresToolbar
          actions={
            <>
              <SearchInput
                search={query.search}
                invalidSearch={query.invalidSearch}
                onSearchChange={query.handleSearchChange}
              />
              <HmdFilter
                player={player}
                hmdFilter={hmdFilter}
                onHmdFilterChange={value =>
                  query.handleFilterChange(() => setHmdFilter(value === "All Hmds" ? null : (value as HMD)))
                }
              />
            </>
          }
        >
          <ScoreSortControl
            options={SORT_OPTIONS}
            activeSort={query.sort}
            direction={query.direction}
            hasDirection
            isBusy={query.isLoading || query.isRefetching}
            onSortChange={query.handleSortChange}
          />
        </ScoresToolbar>

        <ScoresListPanel
          page={query.page}
          data={query.data}
          isLoading={query.isLoading}
          isRefetching={query.isRefetching}
          isError={query.isError}
          generatePageUrl={query.buildUrl}
          onPageChange={query.handlePageChange}
          getKey={score => String(score.score.scoreId)}
          renderItem={score => (
            <ScoreSaberScoreDisplay
              score={score.score}
              leaderboard={score.leaderboard}
              beatSaverMap={score.beatSaver}
              settings={{
                defaultLeaderboardScoresPage: 1,
                medalsMode: true,
              }}
            />
          )}
        />
      </div>
    </ScoresCard>
  );
}
