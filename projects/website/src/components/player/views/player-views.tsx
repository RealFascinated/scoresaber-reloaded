"use client";

import { HistoryMode } from "@/common/player/history-mode";
import Card from "@/components/card";
import { Spinner } from "@/components/spinner";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useIsMobile } from "@/contexts/viewport-context";
import useDatabase from "@/hooks/use-database";
import { useStableLiveQuery } from "@/hooks/use-stable-live-query";
import { GlobeAmericasIcon } from "@heroicons/react/24/solid";
import ScoreSaberPlayer from "@ssr/common/player/impl/scoresaber-player";
import { PlayerStatisticHistory } from "@ssr/common/player/player-statistic-history";
import { ssrApi } from "@ssr/common/utils/ssr-api";
import { getDaysAgo, getDaysAgoDate } from "@ssr/common/utils/time-utils";
import { useQuery } from "@tanstack/react-query";
import { CalculatorIcon, ChartBarIcon, SwordIcon, TrendingUpIcon } from "lucide-react";
import { ReactElement, useState } from "react";
import PlayerRankingsButton from "../buttons/player-rankings-button";
import PlayerAccuracyChart from "./impl/player-accuracy-chart";
import PlayerAdvancedRankingChart from "./impl/player-advanced-ranking-chart";
import PlayerScoresChart from "./impl/player-scores-chart";
import PlayerSimpleRankingChart from "./impl/player-simple-ranking-chart";
import PlusPpCalculator from "./impl/plus-pp-calculator";
import ScoresGraphChart from "./impl/scores-graph-chart";

// Constants
const DATE_PRESETS = [
  { label: "Last 50 Days", value: 50 },
  { label: "Last 90 Days", value: 90 },
  { label: "Last 180 Days", value: 180 },
  { label: "Last 365 Days", value: 365 },
  { label: "Since Tracked", value: Infinity },
] as const;

const DEFAULT_DAYS_AGO = 50;

type SelectedView = {
  index: number;
  label: string;
  showDateRangeSelector: boolean;
  wrapCard: boolean;
  icon: React.ElementType;
  chart: (player: ScoreSaberPlayer, statisticHistory: PlayerStatisticHistory) => ReactElement;
};

function ViewSelector({
  views,
  selectedView,
  onViewSelect,
}: {
  views: SelectedView[];
  selectedView: SelectedView;
  onViewSelect: (view: SelectedView) => void;
}) {
  return (
    <div className="flex flex-wrap items-center justify-center gap-1">
      {views.map(view => (
        <Button
          key={view.index}
          onClick={() => onViewSelect(view)}
          variant={view.index === selectedView.index ? "default" : "outline"}
          size="sm"
          className="flex items-center gap-2"
        >
          <view.icon className="hidden size-4 md:block" />
          <span>{view.label}</span>
        </Button>
      ))}
    </div>
  );
}

function DateRangeSelector({
  daysAgo,
  onDaysChange,
}: {
  daysAgo: number;
  onDaysChange: (days: number) => void;
}) {
  return (
    <Select
      value={daysAgo === Infinity ? "Infinity" : daysAgo.toString()}
      onValueChange={value => onDaysChange(value === "Infinity" ? Infinity : parseInt(value))}
    >
      <SelectTrigger className="w-[180px] cursor-pointer">
        <SelectValue placeholder="Select time range" />
      </SelectTrigger>
      <SelectContent>
        {DATE_PRESETS.map(preset => (
          <SelectItem
            key={preset.value}
            value={preset.value === Infinity ? "Infinity" : preset.value.toString()}
            className="cursor-pointer"
          >
            {preset.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

// Main component
export default function PlayerViews({ player }: { player: ScoreSaberPlayer }) {
  const isMobile = useIsMobile("2xl");
  const database = useDatabase();
  const historyMode = useStableLiveQuery(() => database.getHistoryMode());

  const [selectedViewIndex, setSelectedViewIndex] = useState(0);
  const [daysAgo, setDaysAgo] = useState(DEFAULT_DAYS_AGO);
  const actualDaysAgo = daysAgo === Infinity ? getDaysAgo(player.trackedSince) : daysAgo;

  const { data: statisticHistory } = useQuery({
    queryKey: ["player-statistic-history", player.id, daysAgo],
    queryFn: () =>
      ssrApi.getPlayerStatisticHistory(player.id, getDaysAgoDate(actualDaysAgo), new Date()),
  });

  const views: SelectedView[] = [
    {
      index: 0,
      label: "Ranking",
      icon: GlobeAmericasIcon,
      showDateRangeSelector: true,
      wrapCard: true,
      chart: (_: ScoreSaberPlayer, statisticHistory: PlayerStatisticHistory) => {
        switch (historyMode) {
          case HistoryMode.SIMPLE:
            return (
              <PlayerSimpleRankingChart
                statisticHistory={statisticHistory}
                daysAmount={actualDaysAgo}
              />
            );
          case HistoryMode.ADVANCED:
            return (
              <PlayerAdvancedRankingChart
                statisticHistory={statisticHistory}
                daysAmount={actualDaysAgo}
              />
            );
          default:
            return (
              <PlayerSimpleRankingChart
                statisticHistory={statisticHistory}
                daysAmount={actualDaysAgo}
              />
            );
        }
      },
    },
    {
      index: 1,
      label: "Accuracy",
      icon: TrendingUpIcon,
      showDateRangeSelector: true,
      wrapCard: true,
      chart: (_, statisticHistory) => (
        <PlayerAccuracyChart statisticHistory={statisticHistory} daysAmount={actualDaysAgo} />
      ),
    },
    {
      index: 2,
      label: "Scores",
      icon: SwordIcon,
      showDateRangeSelector: true,
      wrapCard: true,
      chart: (_, statisticHistory) => (
        <PlayerScoresChart statisticHistory={statisticHistory} daysAmount={actualDaysAgo} />
      ),
    },
    {
      index: 3,
      label: "Scores Graph",
      icon: ChartBarIcon,
      showDateRangeSelector: false,
      wrapCard: false,
      chart: player => <ScoresGraphChart player={player} />,
    },
    {
      index: 4,
      label: "PP Calculator",
      icon: CalculatorIcon,
      showDateRangeSelector: false,
      wrapCard: false,
      chart: player => <PlusPpCalculator player={player} />,
    },
  ];

  const selectedView = views[selectedViewIndex];
  return (
    <div className="flex flex-col gap-(--spacing-md)">
      <ViewSelector
        views={views}
        selectedView={selectedView}
        onViewSelect={view => setSelectedViewIndex(view.index)}
      />

      {statisticHistory && historyMode !== undefined ? (
        selectedView.wrapCard ? (
          <Card className="bg-chart-card p-2.5">
            {selectedView.chart(player, statisticHistory)}
          </Card>
        ) : (
          selectedView.chart(player, statisticHistory)
        )
      ) : (
        <Card className="bg-chart-card p-2.5">
          <div className="flex h-[400px] items-center justify-center">
            <Spinner />
          </div>
        </Card>
      )}

      {selectedView.showDateRangeSelector && (
        <div className="flex items-center justify-between gap-2">
          <DateRangeSelector daysAgo={daysAgo} onDaysChange={days => setDaysAgo(days)} />
          {isMobile && <PlayerRankingsButton player={player} />}
        </div>
      )}
    </div>
  );
}
