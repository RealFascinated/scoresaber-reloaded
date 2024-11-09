"use client";

import React from "react";
import ScoreSaberPlayer from "@ssr/common/player/impl/scoresaber-player";
import { getDaysAgoDate, getMidnightAlignedDate, parseDate } from "@ssr/common/utils/time-utils";
import { getValueFromHistory } from "@ssr/common/utils/player-utils";
import { DatasetConfig } from "@/common/chart/types";
import GenericChart from "@/components/chart/generic-chart";

type Props = {
  /**
   * The id of the chart
   */
  id: string;

  /**
   * The player the chart is for
   */
  player: ScoreSaberPlayer;

  /**
   * The data to render.
   */
  datasetConfig: DatasetConfig[];
};

export default function GenericPlayerChart({ id, player, datasetConfig }: Props) {
  // Check if player statistics are available
  if (!player.statisticHistory || Object.keys(player.statisticHistory).length === 0) {
    return (
      <div className="flex justify-center">
        <p>Unable to load player rank chart, missing data...</p>
      </div>
    );
  }

  const histories: Record<string, (number | null)[]> = {};
  const historyDays = 50;

  // Initialize histories for each dataset with null values for all days
  datasetConfig.forEach(config => {
    histories[config.field] = Array(historyDays).fill(null);
  });

  const labels: Date[] = [];

  // Sort the statistic entries by date
  const statisticEntries = Object.entries(player.statisticHistory).sort(
    ([a], [b]) => parseDate(a).getTime() - parseDate(b).getTime()
  );

  let currentHistoryIndex = 0;

  for (let dayAgo = historyDays; dayAgo >= 0; dayAgo--) {
    const targetDate = getMidnightAlignedDate(getDaysAgoDate(dayAgo));
    labels.push(targetDate); // Add the target date to labels

    if (currentHistoryIndex < statisticEntries.length) {
      const [dateString, history] = statisticEntries[currentHistoryIndex];
      const entryDate = parseDate(dateString);

      if (entryDate.toDateString() === targetDate.toDateString()) {
        datasetConfig.forEach(config => {
          histories[config.field][historyDays - dayAgo] = getValueFromHistory(history, config.field) ?? null;
        });
        currentHistoryIndex++;
      }
    }
  }

  // Render the chart with collected data
  return (
    <GenericChart
      options={{
        id: id,
      }}
      labels={labels}
      datasetConfig={datasetConfig}
      histories={histories}
    />
  );
}
