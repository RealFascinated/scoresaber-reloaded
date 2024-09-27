/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { formatNumberWithCommas } from "@/common/number-utils";
import {
  CategoryScale,
  Chart,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  Title,
  Tooltip,
} from "chart.js";
import { Line } from "react-chartjs-2";
import ScoreSaberPlayer from "@/common/model/player/impl/scoresaber-player";

Chart.register(
  LinearScale,
  CategoryScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
);

export const options: any = {
  maintainAspectRatio: false,
  aspectRatio: 1,
  interaction: {
    mode: "index",
    intersect: false,
  },
  scales: {
    y: {
      ticks: {
        autoSkip: true,
        maxTicksLimit: 8,
        stepSize: 1,
      },
      grid: {
        // gray grid lines
        color: "#252525",
      },
      reverse: true,
    },
    x: {
      ticks: {
        autoSkip: true,
      },
      grid: {
        // gray grid lines
        color: "#252525",
      },
    },
  },
  elements: {
    point: {
      radius: 0,
    },
  },
  plugins: {
    legend: {
      position: "top" as const,
      labels: {
        color: "white",
      },
    },
    title: {
      display: false,
    },
    tooltip: {
      callbacks: {
        label(context: any) {
          switch (context.dataset.label) {
            case "Rank": {
              return `Rank #${formatNumberWithCommas(Number(context.parsed.y))}`;
            }
          }
        },
      },
    },
  },
};

type Props = {
  player: ScoreSaberPlayer;
};

export default function PlayerRankChart({ player }: Props) {
  const labels = [];
  for (let i = player.rankHistory.length; i > 0; i--) {
    let label = `${i} days ago`;
    if (i === 1) {
      label = "now";
    }
    if (i === 2) {
      label = "yesterday";
    }
    labels.push(label);
  }

  const data = {
    labels,
    datasets: [
      {
        lineTension: 0.5,
        data: player.rankHistory,
        label: "Rank",
        borderColor: "#606fff",
        fill: false,
        color: "#fff",
      },
    ],
  };

  return (
    <div className="h-96">
      <Line className="w-fit" options={options} data={data} />
    </div>
  );
}
