import { Chart, LegendItem, Plugin } from "chart.js";

/**
 * Shared look for every Chart.js chart on the site, so each chart only defines its data.
 */
export const CHART_THEME = {
  gridColor: "#2c2e34",
  tickColor: "#9b9ea6",
  titleColor: "#c2c4c9",
  hiddenColor: "#5c5f66",
  fontSize: 11,
};

let defaultGenerateLabels: ((chart: Chart) => LegendItem[]) | undefined;

function generateLegendLabels(chart: Chart) {
  if (!defaultGenerateLabels) {
    throw new Error("applyChartTheme must be called before rendering a chart legend");
  }
  return defaultGenerateLabels(chart)
    .filter(item => {
      const data = chart.data.datasets[item.datasetIndex ?? 0]?.data ?? [];
      return data.some(value => value !== null && value !== undefined);
    })
    .map(item => {
      if (item.hidden) {
        return {
          ...item,
          hidden: false,
          fontColor: CHART_THEME.hiddenColor,
          fillStyle: "transparent",
          strokeStyle: CHART_THEME.hiddenColor,
          lineWidth: 1,
        };
      }

      const color = item.lineWidth && item.strokeStyle !== "transparent" ? item.strokeStyle : item.fillStyle;
      return { ...item, fillStyle: color, strokeStyle: color, lineWidth: 0 };
    });
}

const legendSpacingPlugin: Plugin = {
  id: "legendSpacing",
  beforeInit(chart) {
    const legend = chart.legend;
    if (!legend) {
      return;
    }
    const originalFit = legend.fit.bind(legend);
    legend.fit = () => {
      originalFit();
      legend.height += 8;
    };
  },
};

/**
 * Applies {@link CHART_THEME} to the Chart.js defaults. Safe to call more than once.
 */
export function applyChartTheme() {
  Chart.defaults.color = CHART_THEME.tickColor;
  Chart.defaults.borderColor = CHART_THEME.gridColor;
  Chart.defaults.font.size = CHART_THEME.fontSize;

  const legendLabels = Chart.defaults.plugins.legend.labels;
  if (legendLabels.generateLabels !== generateLegendLabels) {
    defaultGenerateLabels = legendLabels.generateLabels;
  }
  legendLabels.color = CHART_THEME.titleColor;
  legendLabels.usePointStyle = true;
  legendLabels.pointStyle = "circle";
  legendLabels.boxWidth = 6;
  legendLabels.boxHeight = 6;
  legendLabels.padding = 12;
  legendLabels.generateLabels = generateLegendLabels;

  Chart.register(legendSpacingPlugin);
}

/**
 * Builds an axis (or chart) title in the shared style.
 */
export function chartTitle(text: string | undefined) {
  return {
    display: text !== undefined,
    text,
    color: CHART_THEME.titleColor,
    font: { size: CHART_THEME.fontSize },
  };
}
