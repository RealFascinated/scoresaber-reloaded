"use client";

import { ArcElement, Chart as ChartJS, ChartOptions, Legend, Tooltip } from "chart.js";
import { Pie } from "react-chartjs-2";

// Register ChartJS components
ChartJS.register(ArcElement, Tooltip, Legend);

type Props = {
  hmdUsage: Record<string, number>;
};

export default function HmdUsageChart({ hmdUsage }: Props) {
  if (!hmdUsage || Object.keys(hmdUsage).length === 0) {
    return (
      <div className="flex justify-center">
        <p>No HMD usage data available</p>
      </div>
    );
  }

  // Sort HMDs by usage count and take top 10
  const sortedHmds = Object.entries(hmdUsage)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10);

  // Calculate total for "Others" category
  const total = Object.values(hmdUsage).reduce((sum, count) => sum + count, 0);
  const top10Total = sortedHmds.reduce((sum, [, count]) => sum + count, 0);
  const othersCount = total - top10Total;

  // Prepare data for the chart
  const data = {
    labels: [...sortedHmds.map(([name]) => name), ...(othersCount > 0 ? ["Others"] : [])],
    datasets: [
      {
        data: [...sortedHmds.map(([, count]) => count), ...(othersCount > 0 ? [othersCount] : [])],
        backgroundColor: [
          "#FF6384",
          "#36A2EB",
          "#FFCE56",
          "#4BC0C0",
          "#9966FF",
          "#FF9F40",
          "#FF6384",
          "#36A2EB",
          "#FFCE56",
          "#4BC0C0",
          "#9966FF",
        ],
      },
    ],
  };

  const options: ChartOptions<"pie"> = {
    responsive: true,
    maintainAspectRatio: false,
    animation: {
      duration: 0,
    },
    plugins: {
      legend: {
        position: "right" as const,
        labels: {
          color: "white",
          padding: 20,
        },
      },
      tooltip: {
        callbacks: {
          label: (context: any) => {
            const value = context.raw;
            const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0);
            const percentage = ((value / total) * 100).toFixed(1);
            return `${context.label}: ${value} (${percentage}%)`;
          },
        },
      },
    },
  };

  return (
    <div className="h-[360px] w-full">
      <Pie data={data} options={options} />
    </div>
  );
}
