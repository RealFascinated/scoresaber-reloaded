"use client";

import { cn } from "@/common/utils";
import SimpleTooltip from "@/components/simple-tooltip";
import { Spinner } from "@/components/spinner";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
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
import { formatDate, getDaysAgoDate } from "@ssr/common/utils/time-utils";
import { useQuery } from "@tanstack/react-query";
import { differenceInDays, subMonths, subYears } from "date-fns";
import { SwordIcon, TrendingUpIcon } from "lucide-react";
import dynamic from "next/dynamic";
import { ReactElement, ReactNode, useState } from "react";
import { DateRange } from "react-day-picker";

function Loading() {
  return (
    <div className="flex items-center justify-center h-[360px]">
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
  chart: (
    player: ScoreSaberPlayer,
    statisticHistory: PlayerStatisticHistory,
    daysAmount: number
  ) => ReactElement<any>;
};

const views: SelectedView[] = [
  {
    index: 0,
    label: "Ranking",
    icon: <GlobeAmericasIcon className="w-5 h-5" />,
    chart: (player, statisticHistory, daysAmount) => (
      <PlayerRankingChart statisticHistory={statisticHistory} daysAmount={daysAmount} />
    ),
  },
  {
    index: 1,
    label: "Accuracy",
    icon: <TrendingUpIcon className="w-[18px] h-[18px]" />,
    chart: (player, statisticHistory, daysAmount) => (
      <PlayerAccuracyChart statisticHistory={statisticHistory} daysAmount={daysAmount} />
    ),
  },
  {
    index: 2,
    label: "Scores",
    icon: <SwordIcon className="w-[18px] h-[18px]" />,
    chart: (player, statisticHistory, daysAmount) => (
      <PlayerScoresChart statisticHistory={statisticHistory} daysAmount={daysAmount} />
    ),
  },
  {
    index: 3,
    label: "Score Calendar",
    icon: <CalendarIcon className="w-[18px] h-[18px]" />,
    chart: (player, statisticHistory) => <ScoreHistoryCalendar playerId={player.id} />,
  },
];

export default function PlayerViews({ player }: PlayerChartsProps) {
  const [dateRange, setDateRange] = useState<DateRange>({
    from: getDaysAgoDate(50),
    to: new Date(),
  });

  const [selectedView, setSelectedView] = useState<SelectedView>(views[0]);

  const { data: statisticHistory } = useQuery({
    queryKey: ["player-statistic-history", player.id, dateRange.to, dateRange.from],
    queryFn: () => ssrApi.getPlayerStatisticHistory(player.id, dateRange.to!, dateRange.from!),
  });

  // get the number of days between the date range
  const daysAmount = differenceInDays(dateRange.to!, dateRange.from!);

  const datePresets = [
    { label: "Last Month", value: () => ({ from: subMonths(new Date(), 1), to: new Date() }) },
    { label: "Last 3 Months", value: () => ({ from: subMonths(new Date(), 3), to: new Date() }) },
    { label: "Last 6 Months", value: () => ({ from: subMonths(new Date(), 6), to: new Date() }) },
    { label: "Last Year", value: () => ({ from: subYears(new Date(), 1), to: new Date() }) },
    { label: "Last 2 Years", value: () => ({ from: subYears(new Date(), 2), to: new Date() }) },
  ];

  return (
    <>
      {statisticHistory ? selectedView.chart(player, statisticHistory, daysAmount) : <Loading />}

      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between gap-2 relative flex-col md:flex-row">
          {/* View Selector */}
          <div className="md:absolute md:left-1/2 md:-translate-x-1/2 flex items-center justify-center gap-2">
            {views.map(view => {
              const isSelected = view.index === selectedView.index;

              return (
                <SimpleTooltip
                  key={view.index}
                  display={
                    <div className="flex justify-center items-center flex-col">
                      <p>{view.label}</p>
                      <p className="text-gray-400">
                        {isSelected ? "Currently Selected" : "Click to view"}
                      </p>
                    </div>
                  }
                >
                  <button
                    onClick={() => setSelectedView(view)}
                    className={`border ${isSelected ? "border-1" : "border-input"} flex items-center justify-center p-[2px] w-[26px] h-[26px] rounded-full hover:brightness-[66%] transition-all`}
                  >
                    {view.icon}
                  </button>
                </SimpleTooltip>
              );
            })}
          </div>

          {/* Date Selector */}
          <div className="flex items-center">
            <div className={cn("grid gap-2")}>
              <Popover>
                <PopoverTrigger asChild>
                  <div className="flex items-center">
                    <Button
                      id="date"
                      variant={"outline"}
                      className={cn(
                        "w-fit justify-start text-left font-normal",
                        !dateRange.from && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="w-[18px] h-[18px] mr-2" />
                      {dateRange.from ? (
                        dateRange.to ? (
                          <>
                            {formatDate(dateRange.from, "MMMM YYYY")} -{" "}
                            {formatDate(dateRange.to, "MMMM YYYY")}
                          </>
                        ) : (
                          formatDate(dateRange.from, "MMMM YYYY")
                        )
                      ) : (
                        <span>Pick a date</span>
                      )}
                    </Button>
                  </div>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="end">
                  <div className="flex flex-col space-y-2 p-2">
                    <Select
                      onValueChange={value => {
                        const preset = datePresets.find(p => p.label === value);
                        if (preset) {
                          setDateRange(preset.value());
                        }
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Quick Select" />
                      </SelectTrigger>
                      <SelectContent position="popper">
                        {datePresets.map(preset => (
                          <SelectItem key={preset.label} value={preset.label}>
                            {preset.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Calendar
                      mode="range"
                      defaultMonth={dateRange.from}
                      selected={dateRange}
                      onSelect={range => range && setDateRange(range)}
                      numberOfMonths={2}
                    />
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
