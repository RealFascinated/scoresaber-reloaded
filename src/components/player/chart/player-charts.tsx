"use client";

import ScoreSaberPlayer from "@/common/model/player/impl/scoresaber-player";
import PlayerRankingChart from "@/components/player/chart/player-ranking-chart";
import { FC, useState } from "react";
import Tooltip from "@/components/tooltip";
import PlayerAccuracyChart from "@/components/player/chart/player-accuracy-chart";

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
   * The chart to render.
   */
  chart: FC<PlayerChartsProps>;

  /**
   * The label of the selected chart.
   */
  label: string;
};

export default function PlayerCharts({ player }: PlayerChartsProps) {
  const charts: SelectedChart[] = [
    {
      index: 0,
      chart: PlayerRankingChart,
      label: "Ranking",
    },
  ];
  if (player.isBeingTracked) {
    charts.push({
      index: 1,
      chart: PlayerAccuracyChart,
      label: "Accuracy",
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
                  className={`border ${isSelected ? "bg-input brightness-75" : "border-input"}  w-fit p-2 rounded-full`}
                />
              </Tooltip>
            );
          })}
      </div>
    </>
  );
}
