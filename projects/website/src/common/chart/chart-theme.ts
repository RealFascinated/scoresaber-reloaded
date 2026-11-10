import { Chart, LegendItem, Plugin } from "chart.js";

/**
 * Shared look for every Chart.js chart on the site, so each chart only defines its data.
 */
export const CHART_THEME = {
  gridColor: "#252525",
  tickColor: "#a3a3a3",
  titleColor: "#d4d4d4",
  hiddenColor: "#5f5f5f",
  fontSize: 11,
};

// Captured in applyChartTheme: the legend defaults only exist once the Legend plugin is registered,
// which happens after this module is evaluated.
let defaultGenerateLabels: ((chart: Chart) => LegendItem[]) | undefined;

/**
 * Builds the legend items in the shared style: every series is a solid dot in its color, hidden
 * series stay toggleable but are shown as a dimmed ring instead of struck through, and series
 * without any data are left out.
 */
function generateLegendLabels(chart: Chart): LegendItem[] {
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

      // Lines are drawn with their border, bars and points with their fill
      const color = item.lineWidth && item.strokeStyle !== "transparent" ? item.strokeStyle : item.fillStyle;
      return { ...item, fillStyle: color, strokeStyle: color, lineWidth: 0 };
    });
}

/**
 * Adds a gap between the legend and the chart area.
 */
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
 *
 * @param text the title text
 */
export function chartTitle(text: string | undefined) {
  return {
    display: text !== undefined,
    text,
    color: CHART_THEME.titleColor,
    font: { size: CHART_THEME.fontSize },
  };
}
