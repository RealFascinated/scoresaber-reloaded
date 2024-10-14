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

export default function GenericPlayerChart({ player, datasetConfig }: Props) {
  // Check if player statistics are available
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

  const labels: Date[] = [];
  const historyDays = 50;

  // Sort the statistic entries by date
  const statisticEntries = Object.entries(player.statisticHistory).sort(
    ([a], [b]) => parseDate(a).getTime() - parseDate(b).getTime()
  );

  const today = new Date();
  let currentHistoryIndex = 0;

  // Iterate from historyDays-1 to 0 (last 'historyDays' days)
  for (let dayAgo = historyDays - 1; dayAgo >= 0; dayAgo--) {
    const targetDate = new Date();
    targetDate.setDate(today.getDate() - dayAgo);

    // Find if there's a matching entry for this date
    let matchedEntry = false;

    // Check if currentHistoryIndex is within bounds of statisticEntries
    if (currentHistoryIndex < statisticEntries.length) {
      const [dateString, history] = statisticEntries[currentHistoryIndex];
      const entryDate = parseDate(dateString);

      // If the entry date matches the target date, use this entry
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
    labels.push(targetDate);
  }

  // Render the chart with collected data
  return <GenericChart labels={labels} datasetConfig={datasetConfig} histories={histories} />;
}
