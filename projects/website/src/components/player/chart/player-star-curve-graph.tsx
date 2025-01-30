/* eslint-disable @typescript-eslint/no-explicit-any */

import React from "react";
import { Chart, ChartOptions, registerables } from "chart.js";
import { Line } from "react-chartjs-2";
import ScoreSaberPlayer from "@ssr/common/player/impl/scoresaber-player";
import { useQuery } from "@tanstack/react-query";
import { ssrApi } from "@ssr/common/utils/ssr-api";
import { LoadingIcon } from "@/components/loading-icon";

Chart.register(...registerables);

type PlayerStarCurveProps = {
  /**
   * The player to display.
   */
  player: ScoreSaberPlayer;
};

const minimumStar = 10;

const PlayerStarCurveGraph = ({ player }: PlayerStarCurveProps) => {
  const { data } = useQuery({
    queryKey: ["player-star-curve", player.id],
    queryFn: async () => {
      const starChartData = await ssrApi.getPlayerStarsChartData(player.id);
      console.log(starChartData);
      if (!starChartData) {
        return [];
      }

      return starChartData.data.map(dataPoint => {
        return [dataPoint.stars, dataPoint.accuracy];
      });
    },
  });

  const datasets = {
    datasets: [
      {
        type: "scatter",
        label: "Data Points",
        data: data,
        pointRadius: 2,
        pointBackgroundColor: "rgba(255, 255, 255, 0.5)",
        pointBorderColor: "rgba(255, 255, 255, 0.5)",
      },
    ],
  };

  const highestStar = Math.ceil(
    data ? Math.max(minimumStar, Math.max(...data.map(dataPoint => dataPoint[0]))) : minimumStar
  );

  const options: ChartOptions = {
    responsive: true,
    animation: false,
    maintainAspectRatio: false,
    scales: {
      x: {
        type: "linear",
        min: 0,
        max: highestStar,
        grid: {
          color: "#252525",
        },
        ticks: {
          color: "white",
        },
        title: {
          display: true,
          text: "Star Rating",
          color: "white",
        },
      },
      y: {
        type: "linear",
        min: 0,
        max: 100,
        grid: {
          color: "#252525",
        },
        ticks: {
          color: "white",
        },
        title: {
          display: true,
          text: "Score %",
          color: "white",
        },
      },
    },
    plugins: {
      tooltip: {
        callbacks: {
          label: (context: any) => {
            return `(${context.parsed.x.toFixed(2)}, ${context.parsed.y.toFixed(2)}%)`;
          },
        },
      },
      legend: {
        display: false,
      },
    },
  };

  return (
    <div className="flex justify-center">
      {data && <Line className="max-w-[100%]" data={datasets as any} options={options as any} />}
      {!data && <LoadingIcon />}
    </div>
  );
};

export default PlayerStarCurveGraph;
