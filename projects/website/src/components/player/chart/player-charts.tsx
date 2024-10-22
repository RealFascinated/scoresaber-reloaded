"use client";

import PlayerRankingChart from "@/components/player/chart/charts/player-ranking-chart";
import { FC, useState } from "react";
import Tooltip from "@/components/tooltip";
import PlayerAccuracyChart from "@/components/player/chart/charts/player-accuracy-chart";
import { GlobeAmericasIcon } from "@heroicons/react/24/solid";
import { TrendingUpIcon } from "lucide-react";
import ScoreSaberPlayer from "@ssr/common/player/impl/scoresaber-player";
import PlayerScoresChart from "@/components/player/chart/charts/player-scores-chart";
import { PiSwordFill } from "react-icons/pi";

type PlayerChartsProps = {
  /**
   * The player who the charts are for
   */
  player: ScoreSaberPlayer;
};

type SelectedChart = {
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
  icon: React.ReactNode;

  /**
   * The chart to render.
   */
  chart: FC<PlayerChartsProps>;
};

export default function PlayerCharts({ player }: PlayerChartsProps) {
  const charts: SelectedChart[] = [
    {
      index: 0,
      label: "Ranking",
      icon: <GlobeAmericasIcon className="w-5 h-5" />,
      chart: PlayerRankingChart,
    },
  ];
  if (player.isBeingTracked) {
    charts.push({
      index: 1,
      label: "Accuracy",
      icon: <TrendingUpIcon className="w-[18px] h-[18px]" />,
      chart: PlayerAccuracyChart,
    });
    charts.push({
      index: 2,
      label: "Scores",
      icon: <PiSwordFill className="w-[18px] h-[18px]" />,
      chart: PlayerScoresChart,
    });
  }

  const [selectedChart, setSelectedChart] = useState<SelectedChart>(charts[0]);

  return (
    <>
      {selectedChart.chart({ player })}

      <div className="flex items-center justify-center gap-2">
        {charts.length > 1 &&
          charts.map(chart => {
            const isSelected = chart.index === selectedChart.index;

            return (
              <Tooltip
                key={chart.index}
                display={
                  <div className="flex justify-center items-center flex-col">
                    <p>{chart.label} Chart</p>
                    <p className="text-gray-600">{isSelected ? "Currently Selected" : "Click to view"}</p>
                  </div>
                }
              >
                <button
                  onClick={() => setSelectedChart(chart)}
                  className={`border ${isSelected ? "border-1" : "border-input"} flex items-center justify-center p-[2px] w-[26px] h-[26px] rounded-full hover:brightness-[66%] transform-gpu transition-all`}
                >
                  {chart.icon}
                </button>
              </Tooltip>
            );
          })}
      </div>
    </>
  );
}
