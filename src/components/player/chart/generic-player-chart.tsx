"use client";

import { getDaysAgo, parseDate } from "@/common/time-utils";
import ScoreSaberPlayer from "@/common/model/player/impl/scoresaber-player";
import React from "react";
import GenericChart, { DatasetConfig } from "@/components/chart/generic-chart";
import { getValueFromHistory } from "@/common/player-utils";

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

export default function GenericPlayerChart({ player, datasetConfig }: Props) {
  if (!player.statisticHistory || Object.keys(player.statisticHistory).length === 0) {
    return (
      <div className="flex justify-center">
        <p>Unable to load player rank chart, missing data...</p>
      </div>
    );
  }

  const labels: string[] = [];
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
        labels.push(`${getDaysAgo(new Date(currentDate.getTime() - i * 24 * 60 * 60 * 1000))} days ago`);
        datasetConfig.forEach(config => {
          histories[config.field].push(null);
        });
      }
    }

    // Add today's label
    const daysAgo = getDaysAgo(currentDate);
    labels.push(daysAgo === 0 ? "Today" : `${daysAgo} days ago`);

    // Push the historical data to histories
    datasetConfig.forEach(config => {
      histories[config.field].push(getValueFromHistory(history, config.field) ?? null);
    });

    previousDate = currentDate; // Update the previousDate for the next iteration
  }

  // Render the GenericChart with collected data
  return <GenericChart labels={labels} datasetConfig={datasetConfig} histories={histories} />;
}
