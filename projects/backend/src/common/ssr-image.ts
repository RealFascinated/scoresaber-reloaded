import { Canvas, createCanvas, GlobalFonts, loadImage, SKRSContext2D } from "@napi-rs/canvas";
import { SSRCache } from "@ssr/common/cache";
import * as path from "node:path";
import { fetchWithCache } from "./cache.util";

// Register fonts once
GlobalFonts.registerFromPath(path.resolve("./src/common/font/Roboto-Medium.ttf"), "SSR");
GlobalFonts.registerFromPath(
  path.resolve("./src/common/font/TwitterColorEmoji-SVGinOT.ttf"),
  "TwitterEmoji"
);

type TextPlacement = "top-left" | "top-right" | "center" | "bottom-left" | "bottom-right";

interface ImageOptions {
  width: number;
  height: number;
}

export interface ImageTextOptions {
  text: string;
  fontSize: number;
  color: string;
}

const backgroundImageCache = new SSRCache({
  ttl: 60 * 60 * 24 * 7, // 7 days
});

export default class SSRImage {
  private canvas: Canvas;
  private ctx: SKRSContext2D;
  private options: ImageOptions;

  constructor(options: ImageOptions) {
    this.options = options;
    this.canvas = createCanvas(options.width, options.height);
    this.ctx = this.canvas.getContext("2d")!;
  }

  async setBackgroundImage(
    url: string,
    options?: {
      blur?: boolean;
    }
  ): Promise<void> {
    if (options?.blur) {
      this.ctx.filter = "blur(1px)";
    }

    this.ctx.drawImage(
      await fetchWithCache(backgroundImageCache, url, () => loadImage(url)),
      0,
      0,
      this.options.width,
      this.options.height
    );

    if (options?.blur) {
      this.ctx.filter = "none";
    }
  }

  drawText(
    lines: ImageTextOptions[],
    placement: TextPlacement = "top-left",
    lineHeightMultiplier: number = 0.9
  ): void {
    const totalHeight = lines.reduce(
      (height, line) => height + line.fontSize * lineHeightMultiplier,
      0
    );
    const placements = {
      "top-left": { x: 0, y: lines[0].fontSize },
      "top-right": { x: this.options.width, y: lines[0].fontSize },
      center: {
        x: 0,
        y: (this.options.height - totalHeight) / 2 + lines[0].fontSize / 2,
      },
      "bottom-left": { x: 0, y: this.options.height - totalHeight + lines[0].fontSize },
      "bottom-right": {
        x: this.options.width,
        y: this.options.height - totalHeight + lines[0].fontSize,
      },
    };

    // eslint-disable-next-line prefer-const
    let { x, y } = placements[placement];

    lines.forEach(line => {
      this.ctx.font = `${line.fontSize}px SSR, TwitterEmoji`;
      this.ctx.fillStyle = line.color;

      let adjustedX = x;
      if (placement === "top-right" || placement === "bottom-right") {
        adjustedX -= this.ctx.measureText(line.text).width;
      } else if (placement === "center") {
        adjustedX = (this.options.width - this.ctx.measureText(line.text).width) / 2;
      }

      this.ctx.fillText(line.text, adjustedX, y);
      y += line.fontSize * lineHeightMultiplier;
    });
  }

  async build(): Promise<Buffer> {
    return await this.canvas.encode("png");
  }
}
