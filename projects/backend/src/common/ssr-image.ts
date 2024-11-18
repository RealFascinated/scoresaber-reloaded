import { Canvas, createCanvas, Image, registerFont } from "canvas";
import ky from "ky";
import * as path from "node:path";

// Register external font
registerFont(path.resolve("./src/common/font/Roboto-Medium.ttf"), { family: "SSR" });

type ImageOptions = {
  /**
   * The width of the image
   */
  width: number;

  /**
   * The height of the image
   */
  height: number;
};

type TextPlacement = "top-left" | "top-right" | "center" | "bottom-left" | "bottom-right";

export default class SSRImage {
  /**
   * The canvas to render items on
   */
  private canvas: Canvas;

  /**
   * The options for the image
   */
  private options: ImageOptions;

  /**
   * Creates a new SSRImage instance
   *
   * @param options the options for the image
   */
  public constructor(options: ImageOptions) {
    this.options = options;
    this.canvas = createCanvas(options.width, options.height);
  }

  /**
   * Gets the canvas context
   */
  public getContext() {
    return this.canvas.getContext("2d");
  }

  /**
   * Sets the background image
   *
   * @param url the url of the image
   */
  public async setBackgroundImage(url: string) {
    const imageBuffer = await ky.get(url).arrayBuffer();

    // Create an Image instance and set its source
    const img = new Image();
    img.src = Buffer.from(imageBuffer);

    // Draw the image on the canvas
    const ctx = this.getContext();
    ctx.drawImage(img, 0, 0, this.options.width, this.options.height);
  }

  /**
   * Draws multi-line text on the canvas with per-line configuration.
   *
   * @param lines Array of objects defining each line's text and configuration.
   * @param placement The placement of the text block on the canvas.
   * @param lineHeightMultiplier The line height multiplier for spacing between lines (default: 0.9).
   */
  public drawText(
    lines: { text: string; fontSize: number; fontFamily: "Arial" | "SSR"; color: string }[],
    placement: TextPlacement,
    lineHeightMultiplier: number = 0.9 // Default to tighter line spacing
  ) {
    const ctx = this.getContext();

    // Calculate total height of the text block (considering line height and multiplier)
    const totalHeight = lines.reduce((height, line) => height + line.fontSize * lineHeightMultiplier, 0);

    // Initial position
    let x = 0;
    let y = 0;

    // Determine starting position based on placement
    switch (placement) {
      case "top-left":
        x = 0;
        y = lines[0].fontSize; // Start with the first line's font size
        break;

      case "top-right":
        x = this.options.width;
        y = lines[0].fontSize;
        break;

      case "center":
        x = 0; // Start at the left
        // Calculate the starting Y position to vertically center the text block
        // Adjust to center the entire block of text, not just the first line
        y = (this.options.height - totalHeight) / 2 + lines[0].fontSize / 2; // Center vertically
        break;

      case "bottom-left":
        x = 0;
        y = this.options.height - totalHeight + lines[0].fontSize;
        break;

      case "bottom-right":
        x = this.options.width;
        y = this.options.height - totalHeight + lines[0].fontSize;
        break;
    }

    // Draw each line with its own specific styles
    lines.forEach(line => {
      ctx.font = `${line.fontSize}px ${line.fontFamily}`;
      ctx.fillStyle = line.color; // Set the text color

      console.log(ctx.font);

      // Adjust X position for alignment (e.g., right-alignment or centering)
      let adjustedX = x;
      if (placement === "top-right" || placement === "bottom-right") {
        adjustedX -= ctx.measureText(line.text).width; // Right-align the text
      } else if (placement === "center") {
        adjustedX = (this.options.width - ctx.measureText(line.text).width) / 2; // Center the text horizontally
      }

      // Draw the current line
      ctx.fillText(line.text, adjustedX, y);

      // Move to the next line's Y position
      y += line.fontSize * lineHeightMultiplier;
    });
  }

  /**
   * Builds the image
   */
  public async build() {
    return this.canvas.toBuffer("image/png");
  }
}