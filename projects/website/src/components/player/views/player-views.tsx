"use client";

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
import { GlobeAmericasIcon } from "@heroicons/react/24/solid";
import ScoreSaberPlayer from "@ssr/common/player/impl/scoresaber-player";
import { PlayerStatisticHistory } from "@ssr/common/player/player-statistic-history";
import { ssrApi } from "@ssr/common/utils/ssr-api";
import { getDaysAgoDate } from "@ssr/common/utils/time-utils";
import { useQuery } from "@tanstack/react-query";
import { CalculatorIcon, ChartBarIcon, SwordIcon, TrendingUpIcon } from "lucide-react";
import { ReactElement, useState } from "react";
import PlayerRankingsButton from "../buttons/player-rankings-button";
import MapsGraphChart from "./impl/maps-graph-chart";
import PlayerAccuracyChart from "./impl/player-accuracy-chart";
import PlayerAdvancedRankingChart from "./impl/player-advanced-ranking-chart";
import PlayerScoresChart from "./impl/player-scores-chart";
import PlusPpCalculator from "./impl/plus-pp-calculator";
import PlayerSimpleRankingChart from "./impl/player-simple-ranking-chart";
import { HistoryMode } from "@/common/player/history-mode";
import useDatabase from "@/hooks/use-database";
import { useLiveQuery } from "dexie-react-hooks";

// Constants
const DATE_PRESETS = [
  { label: "Last 50 Days", value: 50 },
  { label: "Last 90 Days", value: 90 },
  { label: "Last 180 Days", value: 180 },
  { label: "Last 365 Days", value: 365 },
] as const;

const DEFAULT_DAYS_AGO = 50;

type SelectedView = {
  index: number;
  label: string;
  showDateRangeSelector: boolean;
  icon: React.ElementType;
  chart: (player: ScoreSaberPlayer, statisticHistory: PlayerStatisticHistory) => ReactElement;
};

function Loading() {
  return (
    <div className="flex h-[400px] items-center justify-center">
      <Spinner />
    </div>
  );
}

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
    <div className="flex items-center justify-center gap-1">
      {views.map(view => (
        <Button
          key={view.index}
          onClick={() => onViewSelect(view)}
          variant={view.index === selectedView.index ? "default" : "outline"}
          size="sm"
          className="flex items-center gap-2"
        >
          <view.icon className="size-5 md:size-4" />
          <span className="hidden sm:inline">{view.label}</span>
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
    <Select value={daysAgo.toString()} onValueChange={value => onDaysChange(parseInt(value))}>
      <SelectTrigger className="w-[180px] cursor-pointer">
        <SelectValue placeholder="Select time range" />
      </SelectTrigger>
      <SelectContent>
        {DATE_PRESETS.map(preset => (
          <SelectItem key={preset.value} value={preset.value.toString()} className="cursor-pointer">
            {preset.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

// Main component
export default function PlayerViews({ player }: { player: ScoreSaberPlayer }) {
  const isMobile = useIsMobile();
  const database = useDatabase();
  const historyMode = useLiveQuery(() => database.getHistoryMode());

  const [selectedViewIndex, setSelectedViewIndex] = useState(0);
  const [daysAgo, setDaysAgo] = useState(DEFAULT_DAYS_AGO);

  const { data: statisticHistory } = useQuery({
    queryKey: ["player-statistic-history", player.id, daysAgo],
    queryFn: () => {
      return ssrApi.getPlayerStatisticHistory(player.id, getDaysAgoDate(daysAgo), new Date());
    },
  });

  const views: SelectedView[] = [
    ...(historyMode === HistoryMode.SIMPLE
      ? [
          {
            index: 0,
            label: "Ranking",
            icon: GlobeAmericasIcon,
            showDateRangeSelector: true,
            chart: (_: ScoreSaberPlayer, statisticHistory: PlayerStatisticHistory) => (
              <PlayerSimpleRankingChart statisticHistory={statisticHistory} daysAmount={daysAgo} />
            ),
          },
        ]
      : [
          {
            index: 0,
            label: "Ranking",
            icon: GlobeAmericasIcon,
            showDateRangeSelector: true,
            chart: (_: ScoreSaberPlayer, statisticHistory: PlayerStatisticHistory) => (
              <PlayerAdvancedRankingChart
                statisticHistory={statisticHistory}
                daysAmount={daysAgo}
              />
            ),
          },
        ]),
    {
      index: 1,
      label: "Accuracy",
      icon: TrendingUpIcon,
      showDateRangeSelector: true,
      chart: (_, statisticHistory) => (
        <PlayerAccuracyChart statisticHistory={statisticHistory} daysAmount={daysAgo} />
      ),
    },
    {
      index: 2,
      label: "Scores",
      icon: SwordIcon,
      showDateRangeSelector: true,
      chart: (_, statisticHistory) => (
        <PlayerScoresChart statisticHistory={statisticHistory} daysAmount={daysAgo} />
      ),
    },
    {
      index: 3,
      label: "Maps Graph",
      icon: ChartBarIcon,
      showDateRangeSelector: false,
      chart: player => <MapsGraphChart player={player} />,
    },
    {
      index: 4,
      label: "+1 PP Calculator",
      icon: CalculatorIcon,
      showDateRangeSelector: false,
      chart: player => <PlusPpCalculator player={player} />,
    },
  ];

  const selectedView = views[selectedViewIndex];

  const handleViewSelect = (view: SelectedView) => {
    setSelectedViewIndex(view.index);
  };

  const handleDaysChange = (days: number) => {
    setDaysAgo(days);
  };

  return (
    <div className="flex flex-col gap-2">
      <ViewSelector views={views} selectedView={selectedView} onViewSelect={handleViewSelect} />
      {statisticHistory ? selectedView.chart(player, statisticHistory) : <Loading />}
      {selectedView.showDateRangeSelector && (
        <div className="flex items-center justify-between gap-2">
          <DateRangeSelector daysAgo={daysAgo} onDaysChange={handleDaysChange} />
          {isMobile && <PlayerRankingsButton player={player} />}
        </div>
      )}
    </div>
  );
}
