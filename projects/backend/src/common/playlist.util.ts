import ScoreSaberPlayer from "@ssr/common/player/impl/scoresaber-player";
import { CustomRankedPlaylist } from "@ssr/common/playlist/ranked/custom-ranked-playlist";
import { SnipeSettings } from "@ssr/common/snipe/snipe-settings-schema";
import { capitalizeFirstLetter, truncateText } from "@ssr/common/string-utils";
import { formatDateMinimal } from "@ssr/common/utils/time-utils";
import SSRImage, { ImageTextOptions } from "./ssr-image";

const SNIPE_PLAYLIST_RANKED_STATUS_NAMES: Record<string, string> = {
  all: "All Scores",
  ranked: "Ranked Only",
  unranked: "Unranked Only",
};

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
  // Map sort field to display name
  const sortFieldNames: Record<string, string> = {
    pp: "PP",
    date: "Date",
    misses: "Misses",
    acc: "Accuracy",
    score: "Score",
    maxcombo: "Max Combo",
  };

  const sortFieldName = sortFieldNames[settings.sort || "pp"];
  const sortDirection = settings.sortDirection === "asc" ? "Asc" : "Desc";
  const scoreTypeText = SNIPE_PLAYLIST_RANKED_STATUS_NAMES[settings.rankedStatus || "all"];

  const lines = [
    ...(settings.name
      ? [
          {
            text: settings.name,
            color: "#222222",
            fontSize: 45,
            wrap: true,
          },
        ]
      : [
          {
            text: truncateText(toSnipe.name, 16)!,
            color: "#222222",
            fontSize: 45,
          },
        ]),

    {
      text: ``,
      color: "#222222",
      fontSize: 25,
    },
    {
      text: `${sortFieldName} (${sortDirection})`,
      color: "#222222",
      fontSize: 45,
    },
    {
      text: scoreTypeText,
      color: "#2d2d2d",
      fontSize: 40,
    },
  ];

  // Only show star range for ranked maps
  if (
    settings.rankedStatus === "ranked" &&
    settings.starRange?.min != undefined &&
    settings.starRange?.max != undefined
  ) {
    lines.push({
      text: `${settings.starRange.min}⭐ - ${settings.starRange.max}⭐`,
      color: "#2d2d2d",
      fontSize: 40,
    });
  }

  // Always show accuracy range
  lines.push({
    text: `${settings.accuracyRange.min}% - ${settings.accuracyRange.max}%`,
    color: "#2d2d2d",
    fontSize: 40,
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

  return generatePlaylistImage("SSR", {
    lines: [
      {
        text: `ScoreSaber Ranked`,
        color: "#222222",
        fontSize: 45,
      },
      {
        text: `Sort: ${type == "dateRanked" ? "Date Ranked" : "Stars"}`,
        color: "#313131",
        fontSize: 40,
      },
      {
        text: ``,
        color: "#222222",
        fontSize: 45,
      },
      {
        text: `${settings.stars.min}⭐ - ${settings.stars.max}⭐`,
        color: "#2d2d2d",
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
  await image.setBackgroundImage("https://cdn.fascinated.cc/cFkchQkc.png", {
    blur: true,
  });
  image.drawText(
    [
      {
        text: author,
        color: "#000",
        fontSize: 65,
      },
      // Title
      ...(options.title
        ? ([
            {
              text: options.title,
              color: "#222222",
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
  return generatePlaylistImage("SSR", {
    title: `Ranked Batch`,
    lines: [
      {
        text: `${formatDateMinimal(new Date())}`,
        color: "#222222",
        fontSize: 45,
      },
    ],
  });
}
