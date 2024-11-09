"use client";

import React from "react";
import ScoreSaberPlayer from "@ssr/common/player/impl/scoresaber-player";
import { formatDateMinimal, getDaysAgoDate, getMidnightAlignedDate, parseDate } from "@ssr/common/utils/time-utils";
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

  const labels: Date[] = [];
  const histories: Record<string, (number | null)[]> = {};
  const historyDays = 50;

  // Initialize histories for each dataset with null values for all days
  datasetConfig.forEach(config => {
    histories[config.field] = Array(historyDays).fill(null);
  });

  const statisticEntries = Object.entries(player.statisticHistory);
  let currentHistoryIndex = 0;
  for (let dayAgo = 0; dayAgo <= historyDays; dayAgo++) {
    const [dateString, history] = statisticEntries[currentHistoryIndex];
    if (!history) {
      continue;
    }

    labels.push(parseDate(dateString)); // Add the target date to labels
    datasetConfig.forEach(config => {
      histories[config.field][dayAgo] = getValueFromHistory(history, config.field) ?? null;
    });
    currentHistoryIndex++;
  }

  // Reverse the labels and histories arrays to make the latest date and data first
  labels.reverse();
  Object.keys(histories).forEach(field => {
    histories[field].reverse();
  });

  // Render the chart with reversed data
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
