"use client";

import { LoadingIcon } from "@/components/loading-icon";
import Tooltip from "@/components/tooltip";
import { CalendarIcon, GlobeAmericasIcon } from "@heroicons/react/24/solid";
import ScoreSaberPlayer from "@ssr/common/player/impl/scoresaber-player";
import { PlayerStatisticHistory } from "@ssr/common/player/player-statistic-history";
import { ssrApi } from "@ssr/common/utils/ssr-api";
import { getDaysAgoDate } from "@ssr/common/utils/time-utils";
import { useQuery } from "@tanstack/react-query";
import { SwordIcon, TrendingUpIcon } from "lucide-react";
import dynamic from "next/dynamic";
import { ReactElement, ReactNode, useState } from "react";

function Loading() {
  return (
    <div className="flex items-center justify-center h-[360px]">
      <LoadingIcon />
    </div>
  );
}

const PlayerRankingChart = dynamic(() => import("@/components/player/history-views/views/player-ranking-chart"), {
  ssr: false,
  loading: () => <Loading />,
});
const PlayerAccuracyChart = dynamic(() => import("@/components/player/history-views/views/player-accuracy-chart"), {
  ssr: false,
  loading: () => <Loading />,
});
const PlayerScoresChart = dynamic(() => import("@/components/player/history-views/views/player-scores-chart"), {
  ssr: false,
  loading: () => <Loading />,
});
const ScoreHistoryCalendar = dynamic(() => import("@/components/player/history-views/views/score-history-calendar"), {
  ssr: false,
  loading: () => <Loading />,
});

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
  chart: (player: ScoreSaberPlayer, statisticHistory: PlayerStatisticHistory) => ReactElement;
};

export default function PlayerViews({ player }: PlayerChartsProps) {
  const views: SelectedView[] = [
    {
      index: 0,
      label: "Ranking",
      icon: <GlobeAmericasIcon className="w-5 h-5" />,
      chart: (player, statisticHistory) => <PlayerRankingChart statisticHistory={statisticHistory} />,
    },
  ];

  if (player.isBeingTracked) {
    views.push(
      {
        index: 1,
        label: "Accuracy",
        icon: <TrendingUpIcon className="w-[18px] h-[18px]" />,
        chart: (player, statisticHistory) => <PlayerAccuracyChart statisticHistory={statisticHistory} />,
      },
      {
        index: 2,
        label: "Scores",
        icon: <SwordIcon className="w-[18px] h-[18px]" />,
        chart: (player, statisticHistory) => <PlayerScoresChart statisticHistory={statisticHistory} />,
      },
      {
        index: 3,
        label: "Score Calendar",
        icon: <CalendarIcon className="w-[18px] h-[18px]" />,
        chart: (player, statisticHistory) => <ScoreHistoryCalendar playerId={player.id} />,
      }
    );
  }

  const [selectedView, setSelectedView] = useState<SelectedView>(views[0]);

  const { data: statisticHistory } = useQuery({
    queryKey: ["player-statistic-history", player.id],
    queryFn: () => ssrApi.getPlayerStatisticHistory(player.id, new Date(), getDaysAgoDate(30)),
  });

  return (
    <>
      {selectedView.chart(player, statisticHistory)}

      <div className="flex items-center justify-center gap-2">
        {views.length > 1 &&
          views.map(view => {
            const isSelected = view.index === selectedView.index;

            return (
              <Tooltip
                key={view.index}
                display={
                  <div className="flex justify-center items-center flex-col">
                    <p>{view.label}</p>
                    <p className="text-gray-600">{isSelected ? "Currently Selected" : "Click to view"}</p>
                  </div>
                }
              >
                <button
                  onClick={() => setSelectedView(view)}
                  className={`border ${isSelected ? "border-1" : "border-input"} flex items-center justify-center p-[2px] w-[26px] h-[26px] rounded-full hover:brightness-[66%] transform-gpu transition-all`}
                >
                  {view.icon}
                </button>
              </Tooltip>
            );
          })}
      </div>
    </>
  );
}
