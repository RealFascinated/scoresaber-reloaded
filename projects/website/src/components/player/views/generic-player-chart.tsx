"use client";

import { buildChartConfig } from "@/common/chart/build-chart-config";
import type { ChartMarker } from "@/common/chart/chart-markers";
import { DatasetConfig } from "@/common/chart/types";
import GenericChart from "@/components/api/chart/generic-chart-dynamic";
import {
  ScoreSaberPlayerHistory,
  ScoreSaberPlayerHistoryEntries,
} from "@ssr/common/schemas/scoresaber/player/history";
import { getValueFromHistory } from "@ssr/common/utils/player-utils";
import { ssrApi } from "@ssr/common/utils/ssr-api";
import { formatDateMinimal, getMidnightAlignedDate, parseDate } from "@ssr/common/utils/time-utils";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";

type Props = {
  id: string;

  statisticHistory: ScoreSaberPlayerHistoryEntries;

  datasetConfig: DatasetConfig[];

  /**
   * The number of days to show in the chart. Use `-1` for all stored history.
   */
  daysAmount?: number;
};

export default function GenericPlayerChart({ id, statisticHistory, datasetConfig, daysAmount = 50 }: Props) {
  const [today] = useState(() => getMidnightAlignedDate(new Date()));

  const { labels, histories } = useMemo(() => {
    const histories: Record<string, (number | null)[]> = {};

    const dataMap = new Map<string, ScoreSaberPlayerHistory>(Object.entries(statisticHistory));

    const allTime = daysAmount === -1;

    const todayString = formatDateMinimal(today);
    const hasTodayData = dataMap.has(todayString);

    let endDate: Date;
    if (hasTodayData) {
      endDate = new Date(today);
    } else {
      const dates = Array.from(dataMap.keys()).map(parseDate);
      const latestDate = dates.reduce(
        (latest, current) => (current > latest ? current : latest),
        dates[0] ?? today
      );
      endDate = getMidnightAlignedDate(latestDate);
    }

    const labelsResult: Date[] = [];
    if (allTime) {
      const sortedKeys = Array.from(dataMap.keys()).sort(
        (a, b) => parseDate(a).getTime() - parseDate(b).getTime()
      );
      for (const key of sortedKeys) {
        labelsResult.push(getMidnightAlignedDate(parseDate(key)));
      }
    } else {
      const startDate = new Date(endDate);
      startDate.setDate(startDate.getDate() - daysAmount + 1);
      for (let i = 0; i < daysAmount; i++) {
        const currentDate = new Date(startDate);
        currentDate.setDate(startDate.getDate() + i);
        labelsResult.push(currentDate);
      }
    }

    const historyByLabel = labelsResult.map(currentDate => dataMap.get(formatDateMinimal(currentDate)));

    datasetConfig.forEach(config => {
      histories[config.field] = historyByLabel.map(history => {
        const value = history
          ? getValueFromHistory(history, config.field as keyof ScoreSaberPlayerHistory)
          : null;
        return value ?? null;
      });
    });

    return { labels: labelsResult, histories };
  }, [statisticHistory, datasetConfig, daysAmount, today]);

  const { data: rankedBatchMarkers } = useQuery({
    queryKey: ["ranked-batch-markers"],
    queryFn: () => ssrApi.getRankedBatchMarkers(),
    staleTime: Infinity,
    retry: false,
  });

  const chartMarkers = useMemo<ChartMarker[]>(() => {
    if (!rankedBatchMarkers || labels.length === 0) {
      return [];
    }

    const labelDays = labels.map(label => getMidnightAlignedDate(label).getTime());
    const markers: ChartMarker[] = [];
    for (const rankedBatch of rankedBatchMarkers) {
      const rankedBatchDay = getMidnightAlignedDate(rankedBatch.date).getTime();
      const index = labelDays.findIndex(day => day >= rankedBatchDay);
      if (index === -1 || rankedBatchDay < labelDays[0]) {
        continue;
      }
      markers.push({ index, label: rankedBatch.name, href: `/ranked-batches/${rankedBatch.id}` });
    }
    return markers;
  }, [rankedBatchMarkers, labels]);

  if (!statisticHistory || Object.keys(statisticHistory).length === 0) {
    return (
      <div className="flex h-[400px] items-center justify-center">
        <p className="text-muted-foreground text-sm">No data for this period yet</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center">
      <div className="h-[400px] w-full">
        <GenericChart
          config={buildChartConfig({ id, datasetConfig, seriesByField: histories })}
          labels={labels}
          markers={chartMarkers}
        />
      </div>
    </div>
  );
}
