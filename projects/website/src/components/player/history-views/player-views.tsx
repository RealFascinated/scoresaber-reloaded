"use client";

import { ReactElement, ReactNode, useState } from "react";
import Tooltip from "@/components/tooltip";
import { CalendarIcon, GlobeAmericasIcon } from "@heroicons/react/24/solid";
import { SwordIcon, TrendingUpIcon } from "lucide-react";
import ScoreSaberPlayer from "@ssr/common/player/impl/scoresaber-player";
import PlayerRankingChart from "@/components/player/history-views/views/player-ranking-chart";
import PlayerAccuracyChart from "@/components/player/history-views/views/player-accuracy-chart";
import PlayerScoresChart from "@/components/player/history-views/views/player-scores-chart";
import ScoreHistoryCalendar from "@/components/player/history-views/views/score-history-calendar";

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
  chart: (player: ScoreSaberPlayer) => ReactElement;
};

const views: SelectedView[] = [
  {
    index: 0,
    label: "Ranking",
    icon: <GlobeAmericasIcon className="w-5 h-5" />,
    chart: player => <PlayerRankingChart player={player} />,
  },
  {
    index: 1,
    label: "Accuracy",
    icon: <TrendingUpIcon className="w-[18px] h-[18px]" />,
    chart: player => <PlayerAccuracyChart player={player} />,
  },
  {
    index: 2,
    label: "Scores",
    icon: <SwordIcon className="w-[18px] h-[18px]" />,
    chart: player => <PlayerScoresChart player={player} />,
  },
  {
    index: 3,
    label: "Score Calendar",
    icon: <CalendarIcon className="w-[18px] h-[18px]" />,
    chart: player => <ScoreHistoryCalendar player={player} />,
  },
];

export default function PlayerViews({ player }: PlayerChartsProps) {
  const playerViews = player.isBeingTracked ? views : views.slice(1, views.length);
  const [selectedView, setSelectedView] = useState<SelectedView>(playerViews[0]);

  return (
    <>
      {selectedView.chart(player)}

      <div className="flex items-center justify-center gap-2">
        {playerViews.length > 1 &&
          playerViews.map(view => {
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
