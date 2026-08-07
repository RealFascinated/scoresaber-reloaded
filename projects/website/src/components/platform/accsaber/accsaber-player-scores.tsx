"use client";

import ScoresListPanel from "@/components/platform/shared/scores-list-panel";
import { usePlayerScoresQuery, type SortOption } from "@/components/platform/shared/use-player-scores-query";
import { Spinner } from "@/components/spinner";
import { SharedIcons } from "@/shared-icons";
import { Pagination } from "@ssr/common/pagination";
import type ScoreSaberPlayer from "@ssr/common/player/impl/scoresaber-player";
import type { AccSaberScoreSort, AccSaberScoreType } from "@ssr/common/schemas/accsaber/query/query";
import type { ScoreResponse } from "@ssr/common/schemas/accsaber/score/score";
import type { AccSaberScoresPageResponse } from "@ssr/common/schemas/response/score/accsaber-scores-page";
import type { SortDirection } from "@ssr/common/schemas/score/query/sort/sort-direction";
import { capitalizeFirstLetter } from "@ssr/common/string-utils";
import { ssrApi } from "@ssr/common/utils/ssr-api";
import { parseAsString, useQueryState } from "nuqs";
import ScoresCard from "../../score/scores-card";
import { ButtonGroup, ControlButton, ControlPanel, ControlRow, Tab, TabGroup } from "../../ui/control-panel";
import AccSaberScoreComponent from "./score/accsaber-score";

const DEFAULT_SORT: AccSaberScoreSort = "date";
const DEFAULT_TYPE: AccSaberScoreType = "overall";
const DEFAULT_DIRECTION: SortDirection = "desc";

const scoreSort: SortOption<AccSaberScoreSort>[] = [
  { name: "AP", value: "ap", icon: <SharedIcons.AccSaberApSortIcon className="h-4 w-4" /> },
  { name: "Date", value: "date", icon: <SharedIcons.AccSaberDateSortIcon className="h-4 w-4" /> },
  { name: "Acc", value: "acc", icon: <SharedIcons.AccSaberAccuracySortIcon className="h-4 w-4" /> },
  {
    name: "Rank",
    value: "ranking",
    icon: <SharedIcons.AccSaberRankSortIcon className="h-4 w-4" />,
    defaultOrder: "asc",
  },
];

const scoreTypes = [
  { name: "Overall", value: "overall", icon: <SharedIcons.AccSaberOverallSortIcon className="h-4 w-4" /> },
  { name: "Tech Acc", value: "tech", icon: <SharedIcons.AccSaberTechAccuracySortIcon className="h-4 w-4" /> },
  {
    name: "Standard Acc",
    value: "standard",
    icon: <SharedIcons.AccSaberStandardAccuracySortIcon className="h-4 w-4" />,
  },
  { name: "True Acc", value: "true", icon: <SharedIcons.AccSaberTrueAccuracySortIcon className="h-4 w-4" /> },
];

type Props = {
  player: ScoreSaberPlayer;
};

export default function AccSaberPlayerScores({ player }: Props) {
  const [type, setType] = useQueryState("type", parseAsString.withDefault(DEFAULT_TYPE)) as [
    AccSaberScoreType,
    (value: AccSaberScoreType | null) => void,
  ];

  const query = usePlayerScoresQuery<AccSaberScoreSort, AccSaberScoresPageResponse>({
    queryKeyPrefix: "playerScores:accsaber",
    playerId: player.id,
    playerName: player.name,
    titleLabel: "AccSaber",
    defaultSort: DEFAULT_SORT,
    sortOptions: scoreSort,
    hasDirection: true,
    hasSearch: false,
    titleExtra: capitalizeFirstLetter(type),
    showDirectionInTitle: false,
    extraKeyParts: [type],
    queryFn: async ({ page, sort, direction }) => {
      const response = await ssrApi.fetchAccSaberPlayerScores(player.id, page, sort, direction, type);
      return response ?? Pagination.empty<ScoreResponse>();
    },
    buildUrl: (pageNum, { sort, direction }) => {
      const params = new URLSearchParams();
      params.set("platform", "accsaber");
      if (sort !== DEFAULT_SORT) {
        params.set("sort", sort);
      }
      if (type !== DEFAULT_TYPE) {
        params.set("type", type);
      }
      if (direction !== DEFAULT_DIRECTION) {
        params.set("direction", direction);
      }
      if (pageNum !== 1) {
        params.set("page", String(pageNum));
      }
      const queryString = params.toString();
      return `/player/${player.id}${queryString ? `?${queryString}` : ""}`;
    },
  });

  return (
    <ScoresCard>
      <div className="flex w-full flex-col gap-2">
        {/* Control Panel */}
        <ControlPanel>
          {/* Type Selection - Top Row */}
          <ControlRow className="mb-2">
            <TabGroup>
              {scoreTypes.map(typeOption => (
                <Tab
                  key={typeOption.value}
                  isActive={typeOption.value === type}
                  onClick={() =>
                    query.handleFilterChange(() => setType(typeOption.value as AccSaberScoreType))
                  }
                >
                  {typeOption.icon}
                  {typeOption.name}
                </Tab>
              ))}
            </TabGroup>
          </ControlRow>

          {/* Sort Options - Middle Row */}
          <ControlRow>
            <ButtonGroup>
              {scoreSort.map(sortOption => (
                <ControlButton
                  key={sortOption.value}
                  isActive={sortOption.value === query.sort}
                  onClick={() => query.handleSortChange(sortOption.value, sortOption.defaultOrder ?? "desc")}
                >
                  {sortOption.value === query.sort ? (
                    query.isLoading || query.isRefetching ? (
                      <Spinner size="sm" className="size-4" />
                    ) : query.direction === "desc" ? (
                      <SharedIcons.SortDescendingIcon className="size-4" />
                    ) : (
                      <SharedIcons.SortAscendingIcon className="size-4" />
                    )
                  ) : (
                    sortOption.icon
                  )}
                  {sortOption.name}
                </ControlButton>
              ))}
            </ButtonGroup>
          </ControlRow>
        </ControlPanel>

        {/* Scores List */}
        <ScoresListPanel
          page={query.page}
          data={query.data}
          isLoading={query.isLoading}
          isRefetching={query.isRefetching}
          isError={query.isError}
          generatePageUrl={query.buildUrl}
          onPageChange={query.handlePageChange}
          getKey={score => String(score.id)}
          renderItem={score => <AccSaberScoreComponent score={score} />}
        />
      </div>
    </ScoresCard>
  );
}
