"use client";

import Card from "@/components/card";
import { ScoreSaberLeaderboard } from "@ssr/common/model/leaderboard/impl/scoresaber-leaderboard";
import { PlaysByHmdResponse } from "@ssr/common/response/plays-by-hmd-response";
import { ssrApi } from "@ssr/common/utils/ssr-api";
import { stringToColor } from "@ssr/common/utils/utils";
import { useQuery } from "@tanstack/react-query";
import {
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  Title,
  Tooltip,
} from "chart.js";
import { Bar } from "react-chartjs-2";

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

type Props = {
  /**
   * The leaderboard to get HMD data for
   */
  leaderboard: ScoreSaberLeaderboard;
};

export default function LeaderboardHmdPlays({ leaderboard }: Props) {
  const { data: hmdData = {} } = useQuery<PlaysByHmdResponse>({
    queryKey: ["leaderboard-hmd", leaderboard.id],
    queryFn: () => ssrApi.getPlaysByHmdForLeaderboard(leaderboard.id.toString()),
  });

  // Sort HMDs by count and get top 10
  const sortedHmds = Object.entries(hmdData)
    .sort(([, a], [, b]) => (b as number) - (a as number))
    .slice(0, 10);

  const data = {
    labels: sortedHmds.map(([hmd]) => hmd),
    datasets: [
      {
        label: "Plays",
        data: sortedHmds.map(([, count]) => count as number),
        backgroundColor: sortedHmds.map(([hmd]) => stringToColor(hmd)),
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    animation: {
      duration: 0,
    },
    plugins: {
      legend: {
        display: false,
      },
      title: {
        display: false,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: "Plays",
        },
        ticks: {
          precision: 0,
          maxTicksLimit: 5,
        },
      },
      x: {
        title: {
          display: false,
        },
        ticks: {
          maxRotation: 45,
          minRotation: 45,
          font: {
            size: 11,
          },
        },
      },
    },
    layout: {
      padding: {
        top: 20,
        right: 10,
        bottom: 20,
        left: 0,
      },
    },
  };

  return (
    <Card>
      <div className="flex flex-col">
        <p className="font-semibold">Headset Distribution (Top 10)</p>
        <p className="text-sm text-gray-400">Only includes tracked scores.</p>
        <div className="h-[300px] sm:h-[400px]">
          <Bar data={data} options={options} />
        </div>
      </div>
    </Card>
  );
}
