import ScoreSaberPlayer from "@ssr/common/player/impl/scoresaber-player";
import { CustomRankedPlaylist } from "@ssr/common/playlist/ranked/custom-ranked-playlist";
import { SnipeSettings } from "@ssr/common/snipe/snipe-settings-schema";
import { capitalizeFirstLetter, truncateText } from "@ssr/common/string-utils";
import { formatDate } from "@ssr/common/utils/time-utils";
import SSRImage, { ImageTextOptions } from "./ssr-image";

/**
 * Generates a playlist image for a Snipe
 *
 * @param settings the snipe playlist settings
 * @param toSnipe the player to snipe
 * @returns the base64 encoded image
 */
export async function generateSnipePlaylistImage(
  settings: SnipeSettings,
  toSnipe: ScoreSaberPlayer
): Promise<string> {
  const sortFieldNames: Record<string, string> = {
    pp: "PP",
    date: "Date",
    misses: "Misses",
    acc: "Accuracy",
    score: "Score",
    maxcombo: "Max Combo",
  };
  const rankedStatusNames: Record<string, { text: string; color: string }> = {
    all: { text: "All Scores", color: "#fff" },
    ranked: { text: "Ranked Only", color: "#ffde1a" },
    unranked: { text: "Unranked Only", color: "#fff" },
  };

  const sortFieldName = sortFieldNames[settings.sort || "pp"];
  const sortDirection = settings.sortDirection === "asc" ? "Asc" : "Desc";
  const scoreTypeText = rankedStatusNames[settings.rankedStatus || "all"].text;

  const lines = [
    ...(settings.name
      ? [
          {
            text: settings.name,
            color: "#fff",
            fontSize: 45,
            wrap: true,
          },
        ]
      : [
          {
            text: truncateText(toSnipe.name, 16)!,
            color: "#fff",
            fontSize: 45,
          },
        ]),

    {
      text: ``,
      color: "#fff",
      fontSize: 25,
    },
    {
      text: `${sortFieldName} (${sortDirection})`,
      color: "#fff",
      fontSize: 40,
    },
    {
      text: scoreTypeText,
      color: rankedStatusNames[settings.rankedStatus || "all"].color,
      fontSize: 40,
    },
  ];

  lines.push({
    text: ``,
    color: "#fff",
    fontSize: 25,
  });

  // Only show star range for ranked maps
  if (
    settings.rankedStatus === "ranked" &&
    settings.starRange?.min != undefined &&
    settings.starRange?.max != undefined
  ) {
    lines.push({
      text: `${settings.starRange.min}⭐ - ${settings.starRange.max}⭐`,
      color: "#ffde1a",
      fontSize: 40,
    });
  }

  // Always show accuracy range
  lines.push({
    text: `${settings.accuracyRange.min}% - ${settings.accuracyRange.max}%`,
    color: "#fff",
    fontSize: 35,
  });

  return generatePlaylistImage("SSR", { lines });
}

/**
 * Generates a playlist image for a custom ranked playlist
 *
 * @param settings the custom ranked playlist settings
 * @returns the base64 encoded image
 */
export async function generateCustomRankedPlaylistImage(
  settings: CustomRankedPlaylist
): Promise<string> {
  const type = capitalizeFirstLetter(settings.sort);
  const sortNames: Record<string, string> = {
    dateRanked: "Date Ranked",
    stars: "Stars",
  };

  return generatePlaylistImage("SSR", {
    lines: [
      {
        text: `ScoreSaber Ranked`,
        color: "#fff",
        fontSize: 45,
      },
      {
        text: `Sort: ${sortNames[type]}`,
        color: "#fff",
        fontSize: 40,
      },
      {
        text: ``,
        color: "#fff",
        fontSize: 45,
      },
      {
        text: `${settings.stars.min}⭐ - ${settings.stars.max}⭐`,
        color: "#fff",
        fontSize: 45,
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
  await image.setBackgroundImage("https://cdn.fascinated.cc/MW5WDvKW69.png", {
    blur: true,
  });
  image.drawText(
    [
      {
        text: author,
        color: "#ffde1a",
        fontSize: 65,
      },
      // Title
      ...(options.title
        ? ([
            {
              text: options.title,
              color: "#fff",
              fontSize: 55,
              wrap: true,
            },
          ] as ImageTextOptions[])
        : []),

      // Additional lines
      ...(options.lines || []),
    ],
    "center",
    1
  );
  return (await image.build()).toString("base64");
}

/**
 * Generates a playlist image for a ranked batch
 *
 * @returns the base64 encoded image
 */
export async function generateRankedBatchPlaylistImage(): Promise<string> {
  return generatePlaylistImage("ScoreSaber", {
    title: `Ranked Batch`,
    lines: [
      {
        text: `${formatDate(new Date(), "MMMM YYYY")}`,
        color: "#ffde1a",
        fontSize: 40,
      },
    ],
  });
}
