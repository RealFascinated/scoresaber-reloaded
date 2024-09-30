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
import { getDaysAgo, parseDate } from "@/common/time-utils";

Chart.register(
  LinearScale,
  CategoryScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
);

/**
 * A ChartJS axis
 */
type Axis = {
  id: string;
  position: "left" | "right";
  display: boolean;
  grid?: { color?: string; drawOnChartArea?: boolean };
  title?: { display: boolean; text: string; color?: string };
  ticks?: {
    stepSize: number;
  };
  reverse: boolean;
};

/**
 * A ChartJS dataset
 */
type Dataset = {
  label: string;
  data: (number | null)[]; // Allow null values for gaps
  borderColor: string;
  fill: boolean;
  lineTension: number;
  spanGaps: boolean;
  yAxisID: string;
};

/**
 * Generate an axis
 *
 * @param id the id of the axis
 * @param reverse if the axis should be reversed
 * @param display if the axis should be displayed
 * @param position the position of the axis
 * @param displayName the optional name to display for the axis
 */
const generateAxis = (
  id: string,
  reverse: boolean,
  display: boolean,
  position: "right" | "left",
  displayName: string,
): Axis => ({
  id,
  position,
  display,
  grid: {
    drawOnChartArea: id === "y",
    color: id === "y" ? "#252525" : "",
  },
  title: {
    display: true,
    text: displayName,
    color: "#ffffff",
  },
  ticks: {
    stepSize: 10,
  },
  reverse: reverse,
});

/**
 * Create the axes
 */
const createAxes = () => ({
  x: {
    grid: {
      color: "#252525", // gray grid lines
    },
    reverse: false,
  },
  y: generateAxis("y", true, true, "left", "Global Rank"), // Rank axis with display name
  y1: generateAxis("y1", true, false, "left", "Country Rank"), // Country Rank axis with display name
  y2: generateAxis("y2", false, true, "right", "PP"), // PP axis with display name
});

/**
 * Generate a dataset
 *
 * @param label the label of the dataset
 * @param data the data of the dataset
 * @param borderColor the border color of the dataset
 * @param yAxisID the ID of the y-axis
 */
const generateDataset = (
  label: string,
  data: (number | null)[],
  borderColor: string,
  yAxisID: string,
): Dataset => ({
  label,
  data,
  borderColor,
  fill: false,
  lineTension: 0.5,
  spanGaps: false, // Set to false to allow gaps
  yAxisID,
});

export const options: any = {
  maintainAspectRatio: false,
  aspectRatio: 1,
  interaction: {
    mode: "index",
    intersect: false,
  },
  scales: createAxes(), // Use createAxes to configure axes
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
    tooltip: {
      callbacks: {
        label(context: any) {
          switch (context.dataset.label) {
            case "Rank": {
              return `Rank #${formatNumberWithCommas(Number(context.parsed.y))}`;
            }
            case "Country Rank": {
              return `Country Rank #${formatNumberWithCommas(Number(context.parsed.y))}`;
            }
            case "PP": {
              return `PP ${formatNumberWithCommas(Number(context.parsed.y))}pp`;
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
  if (
    player.statisticHistory === undefined ||
    Object.keys(player.statisticHistory).length === 0
  ) {
    return (
      <div className="flex justify-center">
        <p>Unable to load player rank chart, missing data...</p>
      </div>
    );
  }

  const labels: string[] = [];
  const histories: Record<"rank" | "countryRank" | "pp", (number | null)[]> = {
    rank: [],
    countryRank: [],
    pp: [],
  };

  const statisticEntries = Object.entries(player.statisticHistory).sort(
    ([a], [b]) => parseDate(a).getTime() - parseDate(b).getTime(),
  );

  let previousDate: Date | null = null;

  // Create labels and history data
  for (const [dateString, history] of statisticEntries) {
    const currentDate = parseDate(dateString);

    // Insert nulls for missing days
    if (previousDate) {
      const diffDays = Math.floor(
        (currentDate.getTime() - previousDate.getTime()) /
          (1000 * 60 * 60 * 24),
      );

      for (let i = 1; i < diffDays; i++) {
        labels.push(
          `${getDaysAgo(new Date(currentDate.getTime() - i * 24 * 60 * 60 * 1000))} days ago`,
        );
        histories.rank.push(null);
        histories.countryRank.push(null);
        histories.pp.push(null);
      }
    }

    const daysAgo = getDaysAgo(currentDate);
    if (daysAgo === 0) {
      labels.push("Today");
    } else if (daysAgo === 1) {
      labels.push("Yesterday");
    } else {
      labels.push(`${daysAgo} days ago`);
    }

    histories.rank.push(history.rank ?? null);
    histories.countryRank.push(history.countryRank ?? null);
    histories.pp.push(history.pp ?? null);

    previousDate = currentDate;
  }

  const datasets: Dataset[] = [
    generateDataset("Rank", histories["rank"], "#3EC1D3", "y"),
    generateDataset("Country Rank", histories["countryRank"], "#FFEA00", "y1"),
    generateDataset("PP", histories["pp"], "#606fff", "y2"),
  ];

  const data = {
    labels,
    datasets,
  };

  return (
    <div className="h-96">
      <Line className="w-fit" options={options} data={data} />
    </div>
  );
}
