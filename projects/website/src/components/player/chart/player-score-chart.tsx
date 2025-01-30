/* eslint-disable @typescript-eslint/no-explicit-any */

import React from "react";
import { Chart, ChartOptions, registerables } from "chart.js";
import { Line } from "react-chartjs-2";
import ScoreSaberPlayer from "@ssr/common/player/impl/scoresaber-player";
import { useQuery } from "@tanstack/react-query";
import { ssrApi } from "@ssr/common/utils/ssr-api";
import { LoadingIcon } from "@/components/loading-icon";
import { openInNewTab } from "@/common/browser-utils";
import { Config } from "@ssr/common/config";

Chart.register(...registerables);

type PlayerScoreChartProps = {
  /**
   * The player to display.
   */
  player: ScoreSaberPlayer;
};

const minimumStar = 10;

const PlayerScoreChart = ({ player }: PlayerScoreChartProps) => {
  const { data: dataPoints } = useQuery({
    queryKey: ["player-score-chart", player.id],
    queryFn: async () => {
      const scoreChartData = await ssrApi.getPlayerScoreChartData(player.id);
      if (!scoreChartData) {
        return [];
      }

      return scoreChartData.data;
    },
  });

  /**
   * Callback for when a data point is clicked.
   *
   * @param leaderboardId
   */
  const onDataPointClick = (leaderboardId: number) => {
    openInNewTab(`${Config.websiteUrl}/leaderboard/${leaderboardId}`);
  };

  const data = dataPoints?.map(dataPoint => {
    return {
      x: dataPoint.stars,
      y: dataPoint.accuracy,
      leaderboardId: Number(dataPoint.leaderboardId),
      leaderboardName: dataPoint.leaderboardName,
      leaderboardDifficulty: dataPoint.leaderboardDifficulty,
    };
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
        pointHoverRadius: 4,
        pointHoverBackgroundColor: "rgba(255, 255, 255, 0.8)",
      },
    ],
  };

  const highestStar = Math.ceil(data ? Math.max(minimumStar, Math.max(...data.map(point => point.x))) : minimumStar);

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
            const dataPoint = context.raw;
            return [
              `${dataPoint.leaderboardName} [${dataPoint.leaderboardDifficulty}]`,
              `${dataPoint.x.toFixed(2)} ⭐ - ${dataPoint.y.toFixed(2)}%`,
              "",
              "Click to view leaderboard!",
            ];
          },
        },
      },
      legend: {
        display: false,
      },
    },
    onClick: (event: any, elements: any[]) => {
      if (elements.length > 0) {
        const dataIndex = elements[0].index;
        const dataPoint = data?.[dataIndex];
        if (dataPoint) {
          onDataPointClick(dataPoint.leaderboardId);
        }
      }
    },
  };

  return (
    <div className="flex justify-center">
      {data && <Line className="max-w-[100%]" data={datasets as any} options={options as any} />}
      {!data && <LoadingIcon />}
    </div>
  );
};

export default PlayerScoreChart;
