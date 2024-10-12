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
    labels.push("Now");
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
  datasetConfig.forEach(config => {
    histories[config.field] = [];
  });

  // Sort the statistic entries by date
  const statisticEntries = Object.entries(player.statisticHistory).sort(
    ([a], [b]) => parseDate(a).getTime() - parseDate(b).getTime()
  );

  const today = new Date();
  let currentHistoryIndex = 0;

  // Iterate from 50 days ago to today
  for (let dayAgo = historyDays - 1; dayAgo >= 0; dayAgo--) {
    const targetDate = new Date();
    targetDate.setDate(today.getDate() - dayAgo);

    // Check if there is a statistic entry that matches this date
    let matchedEntry = false;

    if (currentHistoryIndex < statisticEntries.length) {
      const [dateString, history] = statisticEntries[currentHistoryIndex];
      const entryDate = parseDate(dateString);

      // If the current statistic entry matches the target date, use it
      if (entryDate.toDateString() === targetDate.toDateString()) {
        datasetConfig.forEach(config => {
          histories[config.field].push(getValueFromHistory(history, config.field) ?? null);
        });
        currentHistoryIndex++;
        matchedEntry = true;
      }
    }

    // If no matching entry, fill the current day with null
    if (!matchedEntry) {
      datasetConfig.forEach(config => {
        histories[config.field].push(null);
      });
    }
  }

  // Render the chart with collected data
  return <GenericChart labels={labels} datasetConfig={datasetConfig} histories={histories} />;
}
