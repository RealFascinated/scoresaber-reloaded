"use client";

import ScoresListPanel from "@/components/platform/shared/scores-list-panel";
import SearchInput from "@/components/platform/shared/search-input";
import { usePlayerScoresQuery, type SortOption } from "@/components/platform/shared/use-player-scores-query";
import { Spinner } from "@/components/spinner";
import useDatabase from "@/hooks/use-database";
import { useStableLiveQuery } from "@/hooks/use-stable-live-query";
import { SharedIcons } from "@/shared-icons";
import { Pagination } from "@ssr/common/pagination";
import ScoreSaberPlayer from "@ssr/common/player/impl/scoresaber-player";
import { PlayerScoresPageResponse } from "@ssr/common/schemas/response/score/player-scores";
import { ScoreSaberScoreSort } from "@ssr/common/score/score-sort";
import { ssrApi } from "@ssr/common/utils/ssr-api";
import ScoresCard from "../../score/scores-card";
import { ButtonGroup, ControlButton, ControlPanel, ControlRow } from "../../ui/control-panel";
import ScoreSaberScoreDisplay from "./score/scoresaber-score";

const DEFAULT_SORT: ScoreSaberScoreSort = "recent";

const SORT_OPTIONS: SortOption<ScoreSaberScoreSort>[] = [
  { name: "Top", value: "top", icon: <SharedIcons.TopScoresTabIcon className="h-4 w-4" /> },
  { name: "Recent", value: "recent", icon: <SharedIcons.RecentScoresTabIcon className="h-4 w-4" /> },
];

interface ScoreSaberPlayerScoresLiveProps {
  player: ScoreSaberPlayer;
}

export default function ScoreSaberPlayerScoresLive({ player }: ScoreSaberPlayerScoresLiveProps) {
  const database = useDatabase();
  const mainPlayerId = useStableLiveQuery(() => database.getMainPlayerId());

  const query = usePlayerScoresQuery<ScoreSaberScoreSort, PlayerScoresPageResponse>({
    queryKeyPrefix: "playerScores:live",
    playerId: player.id,
    playerName: player.name,
    titleLabel: "ScoreSaber",
    defaultSort: DEFAULT_SORT,
    sortOptions: SORT_OPTIONS,
    hasDirection: false,
    extraKeyParts: [mainPlayerId],
    queryFn: async ({ page, sort, search }) => {
      const response = await ssrApi.fetchScoreSaberPlayerScores(player.id, page, sort, search);
      return response || Pagination.empty();
    },
    buildUrl: (pageNum, { sort, search }) => {
      const params = new URLSearchParams();
      if (sort !== DEFAULT_SORT) {
        params.set("sort", sort);
      }
      if (pageNum !== 1) {
        params.set("page", String(pageNum));
      }
      if (search && search.length >= 3) {
        params.set("search", search);
      }
      const queryString = params.toString();
      return `/player/${player.id}${queryString ? `?${queryString}` : ""}`;
    },
  });

  return (
    <ScoresCard>
      <div className="flex w-full flex-col gap-2">
        <ControlPanel>
          <ControlRow className="mb-2">
            <ButtonGroup>
              {SORT_OPTIONS.map(sortOption => (
                <ControlButton
                  key={sortOption.value}
                  isActive={sortOption.value === query.sort}
                  onClick={() => query.handleSortChange(sortOption.value)}
                >
                  {sortOption.value === query.sort && (query.isLoading || query.isRefetching) ? (
                    <Spinner size="sm" className="size-4" />
                  ) : (
                    sortOption.icon
                  )}
                  {sortOption.name}
                </ControlButton>
              ))}
            </ButtonGroup>
          </ControlRow>

          <ControlRow>
            <div className="flex w-full flex-col-reverse items-center gap-2 sm:w-auto sm:flex-row">
              <SearchInput
                search={query.search}
                invalidSearch={query.invalidSearch}
                onSearchChange={query.handleSearchChange}
              />
            </div>
          </ControlRow>
        </ControlPanel>

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
            />
          )}
        />
      </div>
    </ScoresCard>
  );
}
