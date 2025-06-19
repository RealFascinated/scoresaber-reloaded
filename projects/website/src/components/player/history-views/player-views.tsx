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
import { SwordIcon, TrendingUpIcon } from "lucide-react";
import dynamic from "next/dynamic";
import { ReactElement, useState } from "react";

function Loading() {
  return (
    <div className="flex h-[360px] items-center justify-center">
      <Spinner />
    </div>
  );
}

const PlayerRankingChart = dynamic(
  () => import("@/components/player/history-views/views/player-ranking-chart"),
  {
    ssr: false,
    loading: () => <Loading />,
  }
);
const PlayerAccuracyChart = dynamic(
  () => import("@/components/player/history-views/views/player-accuracy-chart"),
  {
    ssr: false,
    loading: () => <Loading />,
  }
);
const PlayerScoresChart = dynamic(
  () => import("@/components/player/history-views/views/player-scores-chart"),
  {
    ssr: false,
    loading: () => <Loading />,
  }
);
const ScoreHistoryCalendar = dynamic(
  () => import("@/components/player/history-views/views/score-history-calendar"),
  {
    ssr: false,
    loading: () => <Loading />,
  }
);

type PlayerChartsProps = {
  /**
   * The player who the charts are for
   */
  player: ScoreSaberPlayer;
};

type SelectedView = {
  /**
   * The index of the selected chart.
   */
  index: number;

  /**
   * The label of the selected chart.
   */
  label: string;

  /**
   * The icon of the selected chart.
   */
  icon: React.ElementType;

  /**
   * The chart to render.
   */
  chart: (player: ScoreSaberPlayer, statisticHistory: PlayerStatisticHistory) => ReactElement<any>;
};

export default function PlayerViews({ player }: PlayerChartsProps) {
  const [selectedView, setSelectedView] = useState<SelectedView | null>(null);
  const [daysAgo, setDaysAgo] = useState(50);

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

  const datePresets = [
    { label: "Last 7 Days", value: 7 },
    { label: "Last 30 Days", value: 30 },
    { label: "Last 50 Days", value: 50 },
    { label: "Last 90 Days", value: 90 },
    { label: "Last 180 Days", value: 180 },
    { label: "Last 365 Days", value: 365 },
    { label: "Last 2 Years", value: 365 * 2 },
    { label: "Last 5 Years", value: 365 * 5 },
  ];

  const views: SelectedView[] = [
    {
      index: 0,
      label: "Rank & PP",
      icon: GlobeAmericasIcon,
      chart: (player, statisticHistory) => (
        <PlayerRankingChart statisticHistory={statisticHistory} daysAmount={daysAgo} />
      ),
    },
    {
      index: 1,
      label: "Accuracy",
      icon: TrendingUpIcon,
      chart: (player, statisticHistory) => (
        <PlayerAccuracyChart statisticHistory={statisticHistory} daysAmount={daysAgo} />
      ),
    },
    {
      index: 2,
      label: "Scores",
      icon: SwordIcon,
      chart: (player, statisticHistory) => (
        <PlayerScoresChart statisticHistory={statisticHistory} daysAmount={daysAgo} />
      ),
    },
    {
      index: 3,
      label: "Score Calendar",
      icon: CalendarIcon,
      chart: (player, statisticHistory) => <ScoreHistoryCalendar playerId={player.id} />,
    },
  ];

  // Initialize selectedView if it's null
  if (!selectedView) {
    setSelectedView(views[0]);
  }

  return (
    <>
      {statisticHistory && selectedView ? (
        selectedView.chart(player, statisticHistory)
      ) : (
        <Loading />
      )}

      <div className="flex flex-col gap-6">
        <div className="relative flex flex-col items-center justify-between gap-2 md:flex-row">
          {/* View Selector */}
          <div className="flex items-center justify-center gap-1 md:absolute md:left-1/2 md:-translate-x-1/2 md:gap-2">
            {views.map(view => (
              <Button
                key={view.index}
                onClick={() => setSelectedView(view)}
                variant={view.index === selectedView?.index ? "default" : "outline"}
                size="sm"
                className="flex items-center gap-2"
              >
                <view.icon className="size-5 md:size-4" />
                <span className="hidden sm:inline">{view.label}</span>
              </Button>
            ))}
          </div>

          {/* Date Range Selector */}
          <div className="flex items-center gap-2">
            <Select value={daysAgo.toString()} onValueChange={value => setDaysAgo(parseInt(value))}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select time range" />
              </SelectTrigger>
              <SelectContent>
                {datePresets.map(preset => (
                  <SelectItem key={preset.value} value={preset.value.toString()}>
                    {preset.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
    </>
  );
}
