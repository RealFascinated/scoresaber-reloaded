const CSS_VARIABLE = /^var\((--[\w-]+)\)$/;

let canvasContext: CanvasRenderingContext2D | null | undefined;

/**
 * Turns a color into one a canvas (Chart.js) can use.
 *
 * `var(--token)` colors are read from the current theme on `<html>` and converted to rgb, since Chart.js
 * can't read CSS variables or parse OKLCH. Any other color is returned unchanged.
 *
 * @param color the color, e.g. `var(--pp)` or `#56d57b`
 * @param alpha the opacity to apply to a `var(--token)` color (0-1)
 */
export function resolveCanvasColor(color: string, alpha = 1): string {
  const match = CSS_VARIABLE.exec(color);
  if (!match || typeof document === "undefined") {
    return color;
  }

  const value = getComputedStyle(document.documentElement).getPropertyValue(match[1]).trim();
  canvasContext ??= document.createElement("canvas").getContext("2d", { willReadFrequently: true });
  if (!value || !canvasContext) {
    throw new Error(`Unable to resolve the theme color ${color} for a chart`);
  }

  // Paint one pixel with the color and read it back, which converts any CSS color syntax to rgb
  canvasContext.clearRect(0, 0, 1, 1);
  canvasContext.fillStyle = "#000";
  canvasContext.fillStyle = value;
  canvasContext.fillRect(0, 0, 1, 1);
  const [red, green, blue] = canvasContext.getImageData(0, 0, 1, 1).data;
  return alpha === 1 ? `rgb(${red}, ${green}, ${blue})` : `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}
