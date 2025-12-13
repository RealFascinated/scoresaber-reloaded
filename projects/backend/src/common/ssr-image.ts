import { Canvas, createCanvas, GlobalFonts, loadImage, SKRSContext2D } from "@napi-rs/canvas";
import { SSRCache } from "@ssr/common/cache";
import * as path from "node:path";
import { fetchWithCache } from "./cache.util";

// Register fonts once - resolve paths correctly in both dev and prod
// In dev: fonts are at src/common/font/ (import.meta.dir points to src/common/)
// In prod: fonts are at dist/font/ or dist/common/font/ (import.meta.dir points to dist/ when bundled)
function registerFont(filename: string, fontName: string): void {
  const paths: string[] = [];

  // Try import.meta.dir first (works in dev and if structure preserved)
  if (import.meta.dir) {
    paths.push(path.resolve(import.meta.dir, "font", filename));
  }

  // Production paths (when bundled, import.meta.dir is dist/)
  paths.push(
    path.resolve(process.cwd(), "dist", "font", filename),
    path.resolve(process.cwd(), "dist", "common", "font", filename),
    path.resolve(process.cwd(), "src", "common", "font", filename) // Dev fallback
  );

  // Try each path until one works
  for (const fontPath of paths) {
    try {
      GlobalFonts.registerFromPath(fontPath, fontName);
      return; // Success
    } catch {
      // Continue to next path
    }
  }

  // If all paths failed, throw error with helpful message
  throw new Error(`Failed to register font ${fontName} from ${filename}. Tried paths: ${paths.join(", ")}`);
}

registerFont("Roboto-Medium.ttf", "SSR");
registerFont("TwitterColorEmoji-SVGinOT.ttf", "TwitterEmoji");

type TextPlacement = "top-left" | "top-right" | "center" | "bottom-left" | "bottom-right";

interface ImageOptions {
  width: number;
  height: number;
}

export interface ImageTextOptions {
  text: string;
  fontSize: number;
  color: string;
  wrap?: boolean;
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
    const blur = options?.blur ?? false;
    if (blur) {
      this.ctx.filter = "blur(2.5px) brightness(0.5)";
    }

    this.ctx.drawImage(
      await fetchWithCache(backgroundImageCache, url, () => loadImage(url)),
      blur ? -5 : 0,
      blur ? -5 : 0,
      this.options.width + (blur ? 10 : 0),
      this.options.height + (blur ? 10 : 0)
    );

    if (blur) {
      this.ctx.filter = "none";
    }
  }

  drawText(lines: ImageTextOptions[], placement: TextPlacement = "top-left", lineHeightMultiplier: number = 0.9): void {
    // Calculate total height of all text including wrapped lines
    let totalHeight = 0;
    lines.forEach(line => {
      if (line.wrap) {
        const maxWidth = this.options.width - 40;
        const words = line.text.split(" ");
        let currentLine = "";
        let lineCount = 0;

        for (let i = 0; i < words.length; i++) {
          const word = words[i];
          const testLine = currentLine + (currentLine ? " " : "") + word;
          const metrics = this.ctx.measureText(testLine);

          if (metrics.width > maxWidth) {
            lineCount++;
            currentLine = word;
          } else {
            currentLine = testLine;
          }
        }
        if (currentLine) lineCount++;
        totalHeight += lineCount * line.fontSize * lineHeightMultiplier;
      } else {
        totalHeight += line.fontSize * lineHeightMultiplier;
      }
    });

    const placements = {
      "top-left": { x: 0, y: lines[0].fontSize },
      "top-right": { x: this.options.width, y: lines[0].fontSize },
      center: {
        x: 0,
        y: (this.options.height - totalHeight) / 2 + lines[0].fontSize,
      },
      "bottom-left": { x: 0, y: this.options.height - totalHeight + lines[0].fontSize },
      "bottom-right": {
        x: this.options.width,
        y: this.options.height - totalHeight + lines[0].fontSize,
      },
    };

    const { x } = placements[placement];
    let { y } = placements[placement];

    lines.forEach(line => {
      this.ctx.font = `${line.fontSize}px SSR, TwitterEmoji`;
      this.ctx.fillStyle = line.color;

      if (line.wrap) {
        const maxWidth = this.options.width - 40;
        const words = line.text.split(" ");
        let currentLine = "";
        let currentY = y;

        for (let i = 0; i < words.length; i++) {
          const word = words[i];
          const testLine = currentLine + (currentLine ? " " : "") + word;
          const metrics = this.ctx.measureText(testLine);

          if (metrics.width > maxWidth) {
            if (placement === "center") {
              const lineWidth = this.ctx.measureText(currentLine).width;
              this.ctx.fillText(currentLine, (this.options.width - lineWidth) / 2, currentY);
            } else if (placement === "top-right" || placement === "bottom-right") {
              const lineWidth = this.ctx.measureText(currentLine).width;
              this.ctx.fillText(currentLine, this.options.width - lineWidth - 20, currentY);
            } else {
              this.ctx.fillText(currentLine, 20, currentY);
            }

            currentLine = word;
            currentY += line.fontSize * lineHeightMultiplier;
          } else {
            currentLine = testLine;
          }
        }

        if (currentLine) {
          if (placement === "center") {
            const lineWidth = this.ctx.measureText(currentLine).width;
            this.ctx.fillText(currentLine, (this.options.width - lineWidth) / 2, currentY);
          } else if (placement === "top-right" || placement === "bottom-right") {
            const lineWidth = this.ctx.measureText(currentLine).width;
            this.ctx.fillText(currentLine, this.options.width - lineWidth - 20, currentY);
          } else {
            this.ctx.fillText(currentLine, 20, currentY);
          }
        }
        y = currentY + line.fontSize * lineHeightMultiplier;
      } else {
        let adjustedX = x;
        if (placement === "top-right" || placement === "bottom-right") {
          adjustedX -= this.ctx.measureText(line.text).width;
        } else if (placement === "center") {
          adjustedX = (this.options.width - this.ctx.measureText(line.text).width) / 2;
        }
        this.ctx.fillText(line.text, adjustedX, y);
        y += line.fontSize * lineHeightMultiplier;
      }
    });
  }

  async build(): Promise<Buffer> {
    return await this.canvas.encode("png");
  }
}
