import { BACKGROUND_COVER_CUSTOM } from "@ssr/common/schemas/user/default-preferences";

export type BackgroundCoverPreset = {
  name: string;
  id: string;
  image: string;
  /** Small preview used by the settings picker so it doesn't download every full-size image */
  thumbnail: string;
};

export const BACKGROUND_COVER_PRESETS: BackgroundCoverPreset[] = [
  {
    name: "Forest",
    id: "forest",
    image: "/backgrounds/forest.webp",
    thumbnail: "/backgrounds/thumbs/forest.webp",
  },
  {
    name: "Alone",
    id: "alone",
    image: "/backgrounds/alone.webp",
    thumbnail: "/backgrounds/thumbs/alone.webp",
  },
  {
    name: "Car Wreck",
    id: "car-wreck",
    image: "/backgrounds/car-wreck.webp",
    thumbnail: "/backgrounds/thumbs/car-wreck.webp",
  },
  {
    name: "Foggy Swamp",
    id: "foggy-swampland",
    image: "/backgrounds/foggy-swampland.webp",
    thumbnail: "/backgrounds/thumbs/foggy-swampland.webp",
  },
  {
    name: "Forest Trail",
    id: "forest-trail",
    image: "/backgrounds/forest-trail.webp",
    thumbnail: "/backgrounds/thumbs/forest-trail.webp",
  },
  {
    name: "Snowy Mountains",
    id: "snowy-mountains",
    image: "/backgrounds/snowy-mountains.webp",
    thumbnail: "/backgrounds/thumbs/snowy-mountains.webp",
  },
  {
    name: "Fantasy Mountains",
    id: "fantasy-mountains",
    image: "/backgrounds/fantasy-mountains.webp",
    thumbnail: "/backgrounds/thumbs/fantasy-mountains.webp",
  },
];

export type ResolvedBackgroundCover = { type: "color"; value: string } | { type: "image"; value: string };

const HEX_COLOR_REGEX = /^#(?:[0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$/i;

/**
 * Parses a user-entered custom background (a hex color or an http(s) image url).
 */
export function parseCustomBackground(value: string): ResolvedBackgroundCover | undefined {
  const trimmed = value.trim();
  if (HEX_COLOR_REGEX.test(trimmed)) {
    return { type: "color", value: trimmed };
  }

  try {
    const url = new URL(trimmed);
    if (url.protocol === "http:" || url.protocol === "https:") {
      return { type: "image", value: url.toString() };
    }
  } catch {
    // Not a url, fall through to invalid
  }
  return undefined;
}

/**
 * Resolves the selected background cover into something renderable.
 */
export function resolveBackgroundCover(cover: string, custom: string): ResolvedBackgroundCover | undefined {
  if (cover === BACKGROUND_COVER_CUSTOM) {
    return parseCustomBackground(custom);
  }
  const preset = BACKGROUND_COVER_PRESETS.find(preset => preset.id === cover);
  return preset ? { type: "image", value: preset.image } : undefined;
}
