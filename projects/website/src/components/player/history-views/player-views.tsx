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
import { CalendarIcon, GlobeAmericasIcon } from "@heroicons/react/24/solid";
import ScoreSaberPlayer from "@ssr/common/player/impl/scoresaber-player";
import { PlayerStatisticHistory } from "@ssr/common/player/player-statistic-history";
import { ssrApi } from "@ssr/common/utils/ssr-api";
import { getDaysAgoDate, getMidnightAlignedDate } from "@ssr/common/utils/time-utils";
import { useQuery } from "@tanstack/react-query";
import { ChartBarIcon, SwordIcon, TrendingUpIcon } from "lucide-react";
import dynamic from "next/dynamic";
import { ReactElement, useState } from "react";

// Constants
const DATE_PRESETS = [
  { label: "Last 7 Days", value: 7 },
  { label: "Last 30 Days", value: 30 },
  { label: "Last 50 Days", value: 50 },
  { label: "Last 90 Days", value: 90 },
  { label: "Last 180 Days", value: 180 },
  { label: "Last 365 Days", value: 365 },
  { label: "Last 2 Years", value: 365 * 2 },
  { label: "Last 5 Years", value: 365 * 5 },
] as const;

const DEFAULT_DAYS_AGO = 50;

// Dynamic imports
const PlayerRankingChart = dynamic(
  () => import("@/components/player/history-views/views/player-ranking-chart"),
  { ssr: false, loading: () => <Loading /> }
);

const PlayerAccuracyChart = dynamic(
  () => import("@/components/player/history-views/views/player-accuracy-chart"),
  { ssr: false, loading: () => <Loading /> }
);

const PlayerScoresChart = dynamic(
  () => import("@/components/player/history-views/views/player-scores-chart"),
  { ssr: false, loading: () => <Loading /> }
);

const ScoreHistoryCalendar = dynamic(
  () => import("@/components/player/history-views/views/score-history-calendar"),
  { ssr: false, loading: () => <Loading /> }
);

const MapsGraphChart = dynamic(
  () => import("@/components/player/history-views/views/maps-graph-chart"),
  { ssr: false, loading: () => <Loading /> }
);

type SelectedView = {
  index: number;
  label: string;
  showDateRangeSelector: boolean;
  icon: React.ElementType;
  chart: (player: ScoreSaberPlayer, statisticHistory: PlayerStatisticHistory) => ReactElement;
};

function Loading() {
  return (
    <div className="flex h-[360px] items-center justify-center">
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
      <SelectTrigger className="w-[180px]">
        <SelectValue placeholder="Select time range" />
      </SelectTrigger>
      <SelectContent>
        {DATE_PRESETS.map(preset => (
          <SelectItem key={preset.value} value={preset.value.toString()}>
            {preset.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

// Main component
export default function PlayerViews({ player }: { player: ScoreSaberPlayer }) {
  const [selectedViewIndex, setSelectedViewIndex] = useState(0);
  const [daysAgo, setDaysAgo] = useState(DEFAULT_DAYS_AGO);

  const { data: statisticHistory } = useQuery({
    queryKey: ["player-statistic-history", player.id, daysAgo],
    queryFn: () => {
      return ssrApi.getPlayerStatisticHistory(
        player.id,
        getMidnightAlignedDate(getDaysAgoDate(daysAgo)),
        getMidnightAlignedDate(new Date())
      );
    },
  });

  const views: SelectedView[] = [
    {
      index: 0,
      label: "Rank & PP",
      icon: GlobeAmericasIcon,
      showDateRangeSelector: true,
      chart: (player, statisticHistory) => (
        <PlayerRankingChart statisticHistory={statisticHistory} daysAmount={daysAgo} />
      ),
    },
    {
      index: 1,
      label: "Accuracy",
      icon: TrendingUpIcon,
      showDateRangeSelector: true,
      chart: (player, statisticHistory) => (
        <PlayerAccuracyChart statisticHistory={statisticHistory} daysAmount={daysAgo} />
      ),
    },
    {
      index: 2,
      label: "Scores",
      icon: SwordIcon,
      showDateRangeSelector: true,
      chart: (player, statisticHistory) => (
        <PlayerScoresChart statisticHistory={statisticHistory} daysAmount={daysAgo} />
      ),
    },
    {
      index: 3,
      label: "Score Calendar",
      icon: CalendarIcon,
      showDateRangeSelector: false,
      chart: (player, statisticHistory) => <ScoreHistoryCalendar playerId={player.id} />,
    },
    {
      index: 4,
      label: "Maps Graph",
      icon: ChartBarIcon,
      showDateRangeSelector: false,
      chart: (player, statisticHistory) => <MapsGraphChart player={player} />,
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
        <DateRangeSelector daysAgo={daysAgo} onDaysChange={handleDaysChange} />
      )}
    </div>
  );
}
