"use client";

import { HistoryMode } from "@/common/player/history-mode";
import Card from "@/components/card";
import { Spinner } from "@/components/spinner";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useIsMobile } from "@/contexts/viewport-context";
import useDatabase from "@/hooks/use-database";
import { useStableLiveQuery } from "@/hooks/use-stable-live-query";
import { GlobeAmericasIcon } from "@heroicons/react/24/solid";
import ScoreSaberPlayer from "@ssr/common/player/impl/scoresaber-player";
import { ScoreSaberPlayerHistoryEntries } from "@ssr/common/schemas/scoresaber/player/history";
import { ssrApi } from "@ssr/common/utils/ssr-api";
import { useQuery } from "@tanstack/react-query";
import { Award, CalculatorIcon, ChartBarIcon, SwordIcon, TrendingUpIcon, TriangleIcon } from "lucide-react";
import dynamic from "next/dynamic";
import { ReactElement, useState } from "react";
import { cn } from "../../../common/utils";
import PlayerRankingsButton from "../buttons/player-rankings-button";

function ChartPanelSkeleton() {
  return (
    <div className="flex h-[400px] items-center justify-center">
      <Spinner />
    </div>
  );
}

const PlayerSimpleRankingChart = dynamic(() => import("./impl/player-simple-ranking-chart"), {
  ssr: false,
  loading: ChartPanelSkeleton,
});
const PlayerAdvancedRankingChart = dynamic(() => import("./impl/player-advanced-ranking-chart"), {
  ssr: false,
  loading: ChartPanelSkeleton,
});
const PlayerAccuracyChart = dynamic(() => import("./impl/player-accuracy-chart"), {
  ssr: false,
  loading: ChartPanelSkeleton,
});
const PlayerScoresChart = dynamic(() => import("./impl/player-scores-chart"), {
  ssr: false,
  loading: ChartPanelSkeleton,
});
const ScoresGraphChart = dynamic(() => import("./impl/scores-graph-chart"), {
  ssr: false,
  loading: ChartPanelSkeleton,
});
const SkillTriangleChart = dynamic(() => import("./impl/skill-triangle-chart"), {
  ssr: false,
  loading: ChartPanelSkeleton,
});
const PlusPpCalculator = dynamic(() => import("./impl/plus-pp-calculator"), {
  ssr: false,
  loading: ChartPanelSkeleton,
});
const PlayerAccuracyBadgesChart = dynamic(() => import("./impl/player-accuracy-badges-chart"), {
  ssr: false,
  loading: ChartPanelSkeleton,
});

const DATE_PRESETS = [
  { label: "Last 50 Days", value: 50 },
  { label: "Last 90 Days", value: 90 },
  { label: "Last 180 Days", value: 180 },
  { label: "Last 365 Days", value: 365 },
  { label: "Since Tracked", value: Infinity },
] as const;

const DEFAULT_DAYS_AGO = 50;

type ViewMeta = {
  index: number;
  label: string;
  showDateRangeSelector: boolean;
  isChart: boolean;
  icon: React.ElementType;
};

const VIEW_METAS: ViewMeta[] = [
  {
    index: 0,
    label: "Ranking",
    icon: GlobeAmericasIcon,
    showDateRangeSelector: true,
    isChart: true,
  },
  {
    index: 1,
    label: "Accuracy",
    icon: TrendingUpIcon,
    showDateRangeSelector: true,
    isChart: true,
  },
  {
    index: 2,
    label: "Scores",
    icon: SwordIcon,
    showDateRangeSelector: true,
    isChart: true,
  },
  {
    index: 3,
    label: "Scores Graph",
    icon: ChartBarIcon,
    showDateRangeSelector: false,
    isChart: true,
  },
  {
    index: 4,
    label: "Skill Triangle",
    icon: TriangleIcon,
    showDateRangeSelector: false,
    isChart: false,
  },
  {
    index: 5,
    label: "PP Calculator",
    icon: CalculatorIcon,
    showDateRangeSelector: false,
    isChart: false,
  },
  {
    index: 6,
    label: "Acc Badges",
    icon: Award,
    showDateRangeSelector: true,
    isChart: true,
  },
];

function PlayerViewPanel({
  viewIndex,
  player,
  statisticHistory,
  actualDaysAgo,
  historyMode,
}: {
  viewIndex: number;
  player: ScoreSaberPlayer;
  statisticHistory: ScoreSaberPlayerHistoryEntries;
  actualDaysAgo: number;
  historyMode: HistoryMode;
}): ReactElement {
  switch (viewIndex) {
    case 0:
      if (historyMode === HistoryMode.ADVANCED) {
        return <PlayerAdvancedRankingChart statisticHistory={statisticHistory} daysAmount={actualDaysAgo} />;
      }
      return <PlayerSimpleRankingChart statisticHistory={statisticHistory} daysAmount={actualDaysAgo} />;
    case 1:
      return <PlayerAccuracyChart statisticHistory={statisticHistory} daysAmount={actualDaysAgo} />;
    case 2:
      return <PlayerScoresChart statisticHistory={statisticHistory} daysAmount={actualDaysAgo} />;
    case 3:
      return <ScoresGraphChart player={player} />;
    case 4:
      return <SkillTriangleChart player={player} />;
    case 5:
      return <PlusPpCalculator player={player} />;
    case 6:
      return <PlayerAccuracyBadgesChart statisticHistory={statisticHistory} daysAmount={actualDaysAgo} />;
    default:
      return <PlayerSimpleRankingChart statisticHistory={statisticHistory} daysAmount={actualDaysAgo} />;
  }
}

function ViewSelector({
  views,
  selectedView,
  onViewSelect,
}: {
  views: ViewMeta[];
  selectedView: ViewMeta;
  onViewSelect: (view: ViewMeta) => void;
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

export default function PlayerViews({ player }: { player: ScoreSaberPlayer }) {
  const isMobile = useIsMobile("2xl");
  const database = useDatabase();
  const historyMode = useStableLiveQuery(() => database.getHistoryMode());

  const [selectedViewIndex, setSelectedViewIndex] = useState(0);
  const [daysAgo, setDaysAgo] = useState(DEFAULT_DAYS_AGO);
  const actualDaysAgo = daysAgo === Infinity ? -1 : daysAgo;

  const { data: statisticHistory } = useQuery({
    queryKey: ["player-statistic-history", player.id, daysAgo],
    queryFn: () => ssrApi.getPlayerStatisticHistory(player.id, actualDaysAgo),
    placeholderData: data => data,
  });

  const selectedView = VIEW_METAS[selectedViewIndex] ?? VIEW_METAS[0];
  return (
    <div className="flex flex-col gap-(--spacing-md)">
      <ViewSelector
        views={VIEW_METAS}
        selectedView={selectedView}
        onViewSelect={view => setSelectedViewIndex(view.index)}
      />

      {statisticHistory && historyMode !== undefined ? (
        <Card className={cn("bg-chart-card", selectedView.isChart ? "p-2.5" : "")}>
          <PlayerViewPanel
            viewIndex={selectedView.index}
            player={player}
            statisticHistory={statisticHistory}
            actualDaysAgo={actualDaysAgo}
            historyMode={historyMode}
          />
        </Card>
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
