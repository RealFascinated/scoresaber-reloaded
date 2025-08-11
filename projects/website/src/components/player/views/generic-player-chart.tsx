"use client";

import { DatasetConfig } from "@/common/chart/types";
import GenericChart from "@/components/chart/generic-chart";
import { PlayerStatisticHistory } from "@ssr/common/player/player-statistic-history";
import { getValueFromHistory } from "@ssr/common/utils/player-utils";
import { formatDateMinimal, getMidnightAlignedDate, parseDate } from "@ssr/common/utils/time-utils";
import { useMemo, useState } from "react";

type Props = {
  /**
   * The id of the chart
   */
  id: string;

  /**
   * The player the chart is for
   */
  statisticHistory: PlayerStatisticHistory;

  /**
   * The data to render.
   */
  datasetConfig: DatasetConfig[];

  /**
   * The number of days to show in the chart.
   */
  daysAmount?: number;
};

export default function GenericPlayerChart({
  id,
  statisticHistory,
  datasetConfig,
  daysAmount = 50,
}: Props) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [samplingInfo, setSamplingInfo] = useState<string | null>(null);

  const { labels, histories } = useMemo(() => {
    setIsProcessing(true);

    const labels: Date[] = [];
    const histories: Record<string, (number | null)[]> = {};

    // Initialize histories for each dataset
    datasetConfig.forEach(config => {
      histories[config.field] = [];
    });

    const statisticEntries = Object.entries(statisticHistory);

    // Sort entries by date
    const sortedEntries = statisticEntries.sort(([dateA], [dateB]) => {
      const timeA = parseDate(dateA).getTime();
      const timeB = parseDate(dateB).getTime();
      return timeA - timeB;
    });

    // Get the latest date from the data
    const latestDataDate = getMidnightAlignedDate(
      parseDate(sortedEntries[sortedEntries.length - 1][0])
    );

    // Create a map of available data for quick lookup
    const dataMap = new Map(sortedEntries.map(([dateString, history]) => [dateString, history]));

    // Use the latest data date as end date, but check if today's data exists
    const today = getMidnightAlignedDate(new Date());
    const todayString = formatDateMinimal(today);
    const hasTodayData = dataMap.has(todayString);

    // Use today as end date if today's data exists, otherwise use latest data date
    const endDate = hasTodayData ? new Date(today) : new Date(latestDataDate);
    const startDate = new Date(endDate);
    startDate.setDate(startDate.getDate() - daysAmount + 1);

    // Optimize for large date ranges by implementing data sampling
    const shouldSample = daysAmount > 365;
    const sampleInterval = shouldSample ? Math.ceil(daysAmount / 365) : 1;
    const maxDataPoints = shouldSample ? 365 : daysAmount;

    // Set sampling info for user feedback
    if (shouldSample) {
      setSamplingInfo(`Showing ${maxDataPoints} data points (sampled from ${daysAmount} days)`);
    } else {
      setSamplingInfo(null);
    }

    // Pre-allocate arrays with the correct size
    const actualDaysToProcess = Math.min(daysAmount, maxDataPoints);

    // Initialize arrays with null values
    datasetConfig.forEach(config => {
      histories[config.field] = new Array(actualDaysToProcess).fill(null);
    });

    // Generate dates and data more efficiently
    let dataPointIndex = 0;
    for (let i = 0; i < daysAmount && dataPointIndex < maxDataPoints; i += sampleInterval) {
      const dateToProcess = new Date(startDate);
      dateToProcess.setDate(startDate.getDate() + i);

      labels.push(dateToProcess);

      // Format the current date to match the format used in statisticHistory keys
      const currentDateString = formatDateMinimal(dateToProcess);
      const history = dataMap.get(currentDateString);

      datasetConfig.forEach(config => {
        const value = history ? getValueFromHistory(history, config.field) : null;
        histories[config.field][dataPointIndex] = value ?? null;
      });

      dataPointIndex++;
    }

    // Trim arrays to actual size if we sampled
    if (shouldSample) {
      datasetConfig.forEach(config => {
        histories[config.field] = histories[config.field].slice(0, dataPointIndex);
      });
    }

    setIsProcessing(false);
    return { labels, histories };
  }, [statisticHistory, datasetConfig, daysAmount]);

  // Check if player statistics are available
  if (!statisticHistory || Object.keys(statisticHistory).length === 0) {
    return (
      <div className="flex justify-center">
        <p>No data available for chart...</p>
      </div>
    );
  }

  if (isProcessing) {
    return (
      <div className="flex justify-center">
        <p>Processing chart data...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center">
      {samplingInfo && <div className="mb-2 text-sm text-gray-400">{samplingInfo}</div>}
      <div className="h-[400px] w-full">
        <GenericChart
          config={{
            id,
            datasets: datasetConfig.map(config => ({
              label: config.title,
              data: histories[config.field],
              color: config.color,
              axisId: config.axisId,
              type: config.type,
              pointRadius: config.pointRadius,
              showLegend: config.showLegend,
              stack: config.stack,
              stackOrder: config.stackOrder,
              labelFormatter: config.labelFormatter,
            })),
            axes: Object.fromEntries(
              datasetConfig.map(config => [config.axisId, config.axisConfig])
            ),
          }}
          labels={labels}
        />
      </div>
    </div>
  );
}
