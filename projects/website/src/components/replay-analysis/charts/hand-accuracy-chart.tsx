"use client";

import { ChartConfig } from "@/common/chart/types";
import GenericChart from "@/components/chart/generic-chart";
import { Replay } from "@ssr/common/replay/replay-decoder";
import { useMemo } from "react";

type Props = {
  replay: Replay;
};

const HandAccuracyChart = ({ replay }: Props) => {
  const { chartData, labels } = useMemo(() => {
    if (!replay.notes || replay.notes.length === 0) {
      return {
        chartData: { datasets: [] },
        labels: [],
      };
    }

    // Calculate cumulative average accuracy up to each second for each hand
    const maxTime = Math.max(...replay.notes.map(note => note.eventTime));
    const seconds = Math.ceil(maxTime);

    const leftHandData: (number | null)[] = [];
    const rightHandData: (number | null)[] = [];
    const timeLabels: string[] = [];

    // Get all cut notes with their scores, separated by hand
    const cutNotes = replay.notes.filter(
      note => note.noteCutInfo && (note.eventType === 0 || note.eventType === 1)
    );

    // Calculate scores for all cut notes, separated by hand
    const leftHandScores = cutNotes
      .filter(note => note.noteCutInfo!.saberType === 0) // Left hand
      .map(note => {
        const cutInfo = note.noteCutInfo!;

        // According to BSOR documentation:
        // beforeCutRating: 1 means 70 score (uncapped, can go over 1)
        const approachScore = Math.max(0, Math.min(70, cutInfo.beforeCutRating * 70));

        // afterCutRating: 1 means 30 score (uncapped, can go over 1)
        const followThroughScore = Math.max(0, Math.min(30, cutInfo.afterCutRating * 30));

        // cutDistanceToCenter: 15 * (1 - Clamp01(cutDistanceToCenter / 0.3f))
        const centerCutScore = Math.max(
          0,
          Math.min(15, 15 * (1 - Math.min(1, cutInfo.cutDistanceToCenter / 0.3)))
        );

        const totalCutScore = Math.round(approachScore + followThroughScore + centerCutScore);
        const finalScore = Math.max(0, Math.min(115, totalCutScore));

        return {
          time: note.eventTime,
          score: finalScore,
        };
      });

    const rightHandScores = cutNotes
      .filter(note => note.noteCutInfo!.saberType === 1) // Right hand
      .map(note => {
        const cutInfo = note.noteCutInfo!;

        // According to BSOR documentation:
        // beforeCutRating: 1 means 70 score (uncapped, can go over 1)
        const approachScore = Math.max(0, Math.min(70, cutInfo.beforeCutRating * 70));

        // afterCutRating: 1 means 30 score (uncapped, can go over 1)
        const followThroughScore = Math.max(0, Math.min(30, cutInfo.afterCutRating * 30));

        // cutDistanceToCenter: 15 * (1 - Clamp01(cutDistanceToCenter / 0.3f))
        const centerCutScore = Math.max(
          0,
          Math.min(15, 15 * (1 - Math.min(1, cutInfo.cutDistanceToCenter / 0.3)))
        );

        const totalCutScore = Math.round(approachScore + followThroughScore + centerCutScore);
        const finalScore = Math.max(0, Math.min(115, totalCutScore));

        return {
          time: note.eventTime,
          score: finalScore,
        };
      });

    // Calculate cumulative average for each second, but only add data points when notes are hit
    for (let second = 0; second <= seconds; second++) {
      const leftNotesUpToTime = leftHandScores.filter(note => note.time <= second);
      const rightNotesUpToTime = rightHandScores.filter(note => note.time <= second);

      let hasData = false;

      if (leftNotesUpToTime.length > 0) {
        const totalScore = leftNotesUpToTime.reduce((sum, note) => sum + note.score, 0);
        const averageAccuracy = totalScore / leftNotesUpToTime.length;
        leftHandData.push(averageAccuracy);
        hasData = true;
      } else {
        leftHandData.push(null);
      }

      if (rightNotesUpToTime.length > 0) {
        const totalScore = rightNotesUpToTime.reduce((sum, note) => sum + note.score, 0);
        const averageAccuracy = totalScore / rightNotesUpToTime.length;
        rightHandData.push(averageAccuracy);
        hasData = true;
      } else {
        rightHandData.push(null);
      }

      if (hasData) {
        timeLabels.push(`${second}s`);
      }
    }

    return {
      chartData: {
        datasets: [
          {
            label: "Left Hand",
            data: leftHandData,
            color: "#ef4444",
            axisId: "y",
            type: "line" as const,
            showLegend: true,
          },
          {
            label: "Right Hand",
            data: rightHandData,
            color: "#3b82f6",
            axisId: "y",
            type: "line" as const,
            showLegend: true,
          },
        ],
      },
      labels: timeLabels,
    };
  }, [replay]);

  const chartConfig: ChartConfig = {
    id: "hand-accuracy",
    datasets: chartData.datasets,
    axes: {
      x: {
        display: true,
        displayName: "Time (seconds)",
        hideOnMobile: false,
      },
      y: {
        display: true,
        displayName: "Average Accuracy (0-115)",
        hideOnMobile: false,
        position: "left",
        // Let the chart auto-scale to show the important data range
      },
    },
    options: {
      plugins: {
        title: {
          display: false,
        },
      },
    },
  };

  if (chartData.datasets.length === 0) {
    return (
      <div className="border-border bg-muted flex h-[400px] w-full items-center justify-center rounded-lg border">
        <p className="text-muted-foreground">No hand accuracy data available</p>
      </div>
    );
  }

  return <GenericChart config={chartConfig} labels={labels} />;
};

export default HandAccuracyChart;
