import type { Chart, Plugin } from "chart.js";
import { CHART_THEME } from "./chart-theme";

/**
 * A vertical line drawn on a category x axis chart, e.g. the day a reweight happened.
 */
export type ChartMarker = {
  /** The index of the x axis label the marker sits on. */
  index: number;
  label: string;
  href: string;
};

export type ChartMarkerConfig = {
  markers: ChartMarker[];
  /** A canvas-ready color. */
  color: string;
  onSelect: (marker: ChartMarker) => void;
};

export type ChartMarkerController = {
  plugin: Plugin<"bar" | "line">;
  setConfig: (config: ChartMarkerConfig) => void;
};

const HIT_DISTANCE_PX = 6;
const DIAMOND_SIZE_PX = 4;
const LABEL_PADDING_PX = 6;

function getMarkerX(chart: Chart, marker: ChartMarker): number {
  return chart.scales.x.getPixelForValue(marker.index);
}

function getNearestMarker(chart: Chart, markers: ChartMarker[], x: number): ChartMarker | undefined {
  let nearest: ChartMarker | undefined;
  let nearestDistance = HIT_DISTANCE_PX;
  for (const marker of markers) {
    const distance = Math.abs(getMarkerX(chart, marker) - x);
    if (distance <= nearestDistance) {
      nearest = marker;
      nearestDistance = distance;
    }
  }
  return nearest;
}

/**
 * Creates a Chart.js plugin that draws a dashed vertical line for each marker. The label of a marker is
 * only drawn while it is hovered, so markers that are close together never overlap, and clicking one
 * selects it.
 *
 * The markers can change without recreating the chart (Chart.js only reads the plugins it was created
 * with), so they are handed over through the returned controller.
 */
export function createChartMarkerPlugin(): ChartMarkerController {
  let hovered: ChartMarker | undefined;
  let config: ChartMarkerConfig = { markers: [], color: "", onSelect: () => {} };
  const getConfig = () => config;

  const plugin: Plugin<"bar" | "line"> = {
    id: "chartMarkers",
    afterEvent(chart, args) {
      const { markers, onSelect } = getConfig();
      const event = args.event;

      if (event.type === "mouseout" || event.x === null || !args.inChartArea) {
        if (hovered) {
          hovered = undefined;
          chart.canvas.style.cursor = "";
          args.changed = true;
        }
        return;
      }

      const nearest = getNearestMarker(chart, markers, event.x);
      if (event.type === "click" && nearest) {
        onSelect(nearest);
        return;
      }
      if (nearest !== hovered) {
        hovered = nearest;
        chart.canvas.style.cursor = nearest ? "pointer" : "";
        args.changed = true;
      }
    },
    afterDatasetsDraw(chart) {
      const { markers, color } = getConfig();
      if (markers.length === 0) {
        return;
      }

      const { ctx, chartArea } = chart;
      ctx.save();
      ctx.beginPath();
      ctx.rect(chartArea.left, 0, chartArea.right - chartArea.left, chartArea.bottom);
      ctx.clip();

      for (const marker of markers) {
        const x = getMarkerX(chart, marker);
        const isHovered = marker === hovered;

        ctx.lineWidth = isHovered ? 2 : 1;
        ctx.strokeStyle = color;
        ctx.fillStyle = color;
        ctx.globalAlpha = isHovered ? 1 : 0.6;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(x, chartArea.top);
        ctx.lineTo(x, chartArea.bottom);
        ctx.stroke();

        ctx.setLineDash([]);
        ctx.beginPath();
        ctx.moveTo(x, chartArea.top);
        ctx.lineTo(x + DIAMOND_SIZE_PX, chartArea.top + DIAMOND_SIZE_PX);
        ctx.lineTo(x, chartArea.top + DIAMOND_SIZE_PX * 2);
        ctx.lineTo(x - DIAMOND_SIZE_PX, chartArea.top + DIAMOND_SIZE_PX);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();

      if (!hovered) {
        return;
      }

      // Draw the hovered label last (and unclipped) so it always sits on top of the other markers
      ctx.save();
      ctx.font = `600 ${CHART_THEME.fontSize}px ${chart.options.font?.family ?? "sans-serif"}`;
      const textWidth = ctx.measureText(hovered.label).width;
      const boxWidth = textWidth + LABEL_PADDING_PX * 2;
      const boxHeight = CHART_THEME.fontSize + LABEL_PADDING_PX * 2;
      const x = getMarkerX(chart, hovered);
      const boxX = Math.min(Math.max(x - boxWidth / 2, chartArea.left), chartArea.right - boxWidth);
      const boxY = chartArea.top + DIAMOND_SIZE_PX * 2 + 4;

      ctx.fillStyle = "rgba(20, 21, 24, 0.95)";
      ctx.strokeStyle = color;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(boxX, boxY, boxWidth, boxHeight, 4);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = CHART_THEME.titleColor;
      ctx.textBaseline = "middle";
      ctx.fillText(hovered.label, boxX + LABEL_PADDING_PX, boxY + boxHeight / 2);
      ctx.restore();
    },
  };

  return {
    plugin,
    setConfig(next) {
      config = next;
    },
  };
}
