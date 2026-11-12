"use client";

import { buildChartConfig } from "@/common/chart/build-chart-config";
import { Colors } from "@/common/colors";
import GenericChart from "@/components/api/chart/generic-chart-dynamic";
import SimpleLink from "@/components/simple-link";
import { LeaderboardStarChange } from "@ssr/common/schemas/leaderboard/leaderboard-star-change";
import { formatDate, getDaysAgo, timeAgo } from "@ssr/common/utils/time-utils";
import { useRouter } from "next/navigation";
import { useMemo } from "react";

export function LeaderboardStarChangeHistory({
  starChangeHistory,
}: {
  starChangeHistory: LeaderboardStarChange[];
}) {
  const router = useRouter();
  const orderedPoints = useMemo(
    () => starChangeHistory.toSorted((a, b) => a.timestamp.getTime() - b.timestamp.getTime()),
    [starChangeHistory]
  );

  const labels = orderedPoints.map(change => change.timestamp.getTime());
  const formatRelativeDate = (value: number, withTime: boolean) => {
    const date = new Date(value);
    if (getDaysAgo(date) <= 7) {
      return timeAgo(date, 1);
    }
    return formatDate(date, withTime ? "Do MMMM, YYYY HH:mm a" : "DD MMMM YYYY");
  };

  const chartConfig = buildChartConfig({
    id: "leaderboard-star-change-history",
    datasetConfig: [
      {
        field: "newStars",
        title: "Stars",
        color: Colors.generic.green,
        axisId: "y",
        pointRadius: 3,
        labelFormatter: value => `Stars: ${value.toFixed(2)}`,
        axisConfig: {
          display: true,
          displayName: "Star Rating",
          position: "left",
          valueFormatter: value => value.toFixed(2),
        },
      },
    ],
    seriesByField: {
      newStars: orderedPoints.map(change => change.newStars),
    },
    options: {
      // Changes that belong to a reweight open it
      onHover: (event, elements) => {
        const target = event.native?.target;
        if (target instanceof HTMLElement) {
          const reweightId = elements[0] ? orderedPoints[elements[0].index]?.reweightId : undefined;
          target.style.cursor = reweightId !== undefined ? "pointer" : "";
        }
      },
      onClick: (_event, elements) => {
        const reweightId = elements[0] ? orderedPoints[elements[0].index]?.reweightId : undefined;
        if (reweightId !== undefined) {
          router.push(`/reweights/${reweightId}`);
        }
      },
      scales: {
        x: {
          type: "linear",
          ticks: {
            callback: tickValue => {
              const value = typeof tickValue === "number" ? tickValue : Number(tickValue);
              return formatRelativeDate(value, false);
            },
          },
        },
      },
    },
  });
  chartConfig.axes.x = {
    display: true,
    displayName: "",
    valueFormatter: (value: number) => formatRelativeDate(value, true),
  };

  const reweightChanges = orderedPoints.filter(change => change.reweightId !== undefined).reverse();

  return (
    <div className="flex w-full flex-col gap-3">
      <div className="h-[450px] w-full">
        <GenericChart config={chartConfig} labels={labels} />
      </div>
      {reweightChanges.length > 0 && (
        <div className="flex flex-col gap-1 text-xs">
          <p className="text-muted-foreground font-medium">Reweights</p>
          {reweightChanges.map(change => (
            <SimpleLink
              key={change.timestamp.getTime()}
              href={`/reweights/${change.reweightId}`}
              className="hover:text-primary flex items-center justify-between gap-2 transition-colors"
            >
              <span>
                {formatDate(change.timestamp, "DD MMMM YYYY")}: {change.previousStars.toFixed(2)} {"->"}{" "}
                {change.newStars === 0 ? "Unranked" : `${change.newStars.toFixed(2)} stars`}
              </span>
              <span className="text-muted-foreground">View reweight</span>
            </SimpleLink>
          ))}
        </div>
      )}
    </div>
  );
}
