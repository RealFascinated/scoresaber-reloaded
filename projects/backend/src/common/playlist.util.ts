import ScoreSaberPlayer from "@ssr/common/player/impl/scoresaber-player";
import { SnipeSettings } from "@ssr/common/snipe/snipe-settings-schema";
import { capitalizeFirstLetter, truncateText } from "@ssr/common/string-utils";
import SSRImage, { ImageTextOptions } from "./ssr-image";

/**
 * Generates a playlist image for a Snipe
 *
 * @param settings the snipe playlist settings
 * @param toSnipe the player to snipe
 * @returns the base64 encoded image
 */
export async function generateSnipePlaylistImage(settings: SnipeSettings, toSnipe: ScoreSaberPlayer): Promise<string> {
  const type = capitalizeFirstLetter(settings.sort);

  return generatePlaylistImage("SSR", {
    lines: [
      {
        text: `Snipe (${type})`,
        color: "#222222",
        fontSize: 55,
      },
      {
        text: truncateText(toSnipe.name, 16)!,
        color: "#222222",
        fontSize: 45,
      },
      {
        text: ``,
        color: "#222222",
        fontSize: 45,
      },
      {
        text: `${settings.starRange.min}⭐ - ${settings.starRange.max}⭐`,
        color: "#2d2d2d",
        fontSize: 50,
      },
      {
        text: `${settings.accuracyRange.min}% - ${settings.accuracyRange.max}%`,
        color: "#2d2d2d",
        fontSize: 50,
      },
    ],
  });
}

/**
 * Generates a playlist image
 *
 * @param author the author of the playlist
 * @param options the options for the playlist image
 * @returns the base64 encoded image
 */
export async function generatePlaylistImage(
  author: string,
  options: {
    title?: string;
    lines?: ImageTextOptions[];
  }
): Promise<string> {
  const image = new SSRImage({
    width: 512,
    height: 512,
  });
  await image.setBackgroundImage("https://cdn.fascinated.cc/cFkchQkc.png", {
    blur: true,
  });
  image.drawText(
    [
      {
        text: author,
        color: "#000",
        fontSize: 100,
      },
      // Title
      ...(options.title
        ? ([
            {
              text: options.title,
              color: "#222222",
              fontSize: 62,
            },
          ] as ImageTextOptions[])
        : []),

      // Additional lines
      ...(options.lines || []),
    ],
    "center",
    0.8
  );
  return (await image.build()).toString("base64");
}
