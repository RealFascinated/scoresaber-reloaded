"use client";

import React from "react";
import GenericChart, { DatasetConfig } from "@/components/chart/generic-chart";
import { getValueFromHistory } from "@/common/player-utils";
import ScoreSaberPlayer from "@ssr/common/types/player/impl/scoresaber-player";
import { parseDate } from "@ssr/common/utils/time-utils";

type Props = {
  /**
   * The player the chart is for
   */
  player: ScoreSaberPlayer;

  /**
   * The data to render.
   */
  datasetConfig: DatasetConfig[];
};

// Set up the labels
const labels: string[] = [];
const historyDays = 50;
for (let day = 0; day < historyDays; day++) {
  if (day == 0) {
    labels.push("Today");
  } else if (day == 1) {
    labels.push("Yesterday");
  } else {
    labels.push(`${day + 1} days ago`);
  }
}
labels.reverse();

export default function GenericPlayerChart({ player, datasetConfig }: Props) {
  if (!player.statisticHistory || Object.keys(player.statisticHistory).length === 0) {
    return (
      <div className="flex justify-center">
        <p>Unable to load player rank chart, missing data...</p>
      </div>
    );
  }
  const histories: Record<string, (number | null)[]> = {};

  // Initialize histories for each dataset
  datasetConfig.forEach(config => {
    histories[config.field] = [];
  });

  // Sort the statistic entries by date
  const statisticEntries = Object.entries(player.statisticHistory).sort(
    ([a], [b]) => parseDate(a).getTime() - parseDate(b).getTime()
  );

  let previousDate: Date | null = null;

  // Iterate through each statistic entry
  for (const [dateString, history] of statisticEntries) {
    const currentDate = parseDate(dateString);

    // Fill in missing days with null values
    if (previousDate) {
      const diffDays = Math.floor((currentDate.getTime() - previousDate.getTime()) / (1000 * 60 * 60 * 24));
      for (let i = 1; i < diffDays; i++) {
        datasetConfig.forEach(config => {
          histories[config.field].push(null);
        });
      }
    }

    // Push the historical data to histories
    datasetConfig.forEach(config => {
      histories[config.field].push(getValueFromHistory(history, config.field) ?? null);
    });

    previousDate = currentDate; // Update the previousDate for the next iteration
  }

  // Render the GenericChart with collected data
  return <GenericChart labels={labels} datasetConfig={datasetConfig} histories={histories} />;
}
