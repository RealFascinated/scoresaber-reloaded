"use client";

import SimpleTooltip from "@/components/simple-tooltip";
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
import { RefreshCcwIcon, SwordIcon, TrendingUpIcon } from "lucide-react";
import dynamic from "next/dynamic";
import { ReactElement, ReactNode, useState } from "react";

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
  icon: ReactNode;

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
      label: "Ranking",
      icon: <GlobeAmericasIcon className="h-5 w-5" />,
      chart: (player, statisticHistory) => (
        <PlayerRankingChart statisticHistory={statisticHistory} daysAmount={daysAgo} />
      ),
    },
    {
      index: 1,
      label: "Accuracy",
      icon: <TrendingUpIcon className="h-[18px] w-[18px]" />,
      chart: (player, statisticHistory) => (
        <PlayerAccuracyChart statisticHistory={statisticHistory} daysAmount={daysAgo} />
      ),
    },
    {
      index: 2,
      label: "Scores",
      icon: <SwordIcon className="h-[18px] w-[18px]" />,
      chart: (player, statisticHistory) => (
        <PlayerScoresChart statisticHistory={statisticHistory} daysAmount={daysAgo} />
      ),
    },
    {
      index: 3,
      label: "Score Calendar",
      icon: <CalendarIcon className="h-[18px] w-[18px]" />,
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
          <div className="flex items-center justify-center gap-2 md:absolute md:left-1/2 md:-translate-x-1/2">
            {views.map(view => {
              const isSelected = view.index === selectedView?.index;

              return (
                <SimpleTooltip
                  key={view.index}
                  display={
                    <div className="flex flex-col items-center justify-center">
                      <p>{view.label}</p>
                      <p className="text-gray-400">
                        {isSelected ? "Currently Selected" : "Click to view"}
                      </p>
                    </div>
                  }
                >
                  <button
                    onClick={() => setSelectedView(view)}
                    className={`border ${isSelected ? "border-1" : "border-input"} flex h-[26px] w-[26px] items-center justify-center rounded-full p-[2px] transition-all hover:brightness-[66%]`}
                  >
                    {view.icon}
                  </button>
                </SimpleTooltip>
              );
            })}
          </div>

          {/* Date Preset Selector and Reset Button */}
          <div className="flex items-center gap-2">
            <SimpleTooltip display={<p>Reset to Last 50 Days</p>}>
              <Button variant={"outline"} size={"icon"} onClick={() => setDaysAgo(50)}>
                <RefreshCcwIcon className="h-4 w-4" />
              </Button>
            </SimpleTooltip>

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
