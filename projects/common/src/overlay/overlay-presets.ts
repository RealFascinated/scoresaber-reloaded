import type { OverlayAnchor } from "../schemas/overlay/overlay-anchor";
import {
  OverlayWidgetTypes,
  type OverlayElement,
  type OverlayWidgetType,
  type PbDeltaOptions,
} from "../schemas/overlay/overlay-element";
import {
  OVERLAY_CANVAS_HEIGHT,
  OVERLAY_CANVAS_WIDTH,
  type OverlayLayout,
} from "../schemas/overlay/overlay-layout";

export type OverlayPreset = {
  id: string;
  name: string;
  description: string;
  layout: OverlayLayout;
};

export const DEFAULT_PB_DELTA_OPTIONS: PbDeltaOptions = { mode: "delta", precision: 2, showLabel: true };

/** The size, anchor and offset a widget gets when it is added to an overlay. */
export const OVERLAY_WIDGET_DEFAULTS: Record<
  OverlayWidgetType,
  { size: OverlayElement["size"]; anchor: OverlayAnchor; offset: { x: number; y: number } }
> = {
  playerAvatar: { size: { w: 96, h: 96 }, anchor: "top-left", offset: { x: 24, y: 24 } },
  playerName: { size: { w: "auto", h: "auto" }, anchor: "top-left", offset: { x: 24, y: 24 } },
  playerRank: { size: { w: "auto", h: "auto" }, anchor: "top-left", offset: { x: 24, y: 24 } },
  playerCountryRank: { size: { w: "auto", h: "auto" }, anchor: "top-left", offset: { x: 24, y: 24 } },
  playerMedals: { size: { w: "auto", h: "auto" }, anchor: "top-left", offset: { x: 24, y: 24 } },
  playerPp: { size: { w: "auto", h: "auto" }, anchor: "top-left", offset: { x: 24, y: 24 } },
  playerBlPp: { size: { w: "auto", h: "auto" }, anchor: "top-left", offset: { x: 24, y: 24 } },
  songCover: { size: { w: 128, h: 128 }, anchor: "bottom-left", offset: { x: 24, y: 24 } },
  songInfo: { size: { w: "auto", h: "auto" }, anchor: "bottom-left", offset: { x: 24, y: 24 } },
  scoreAccuracy: { size: { w: "auto", h: "auto" }, anchor: "bottom-right", offset: { x: 24, y: 24 } },
  scoreCombo: { size: { w: "auto", h: "auto" }, anchor: "bottom-right", offset: { x: 24, y: 24 } },
  scoreScore: { size: { w: "auto", h: "auto" }, anchor: "bottom-right", offset: { x: 24, y: 24 } },
  scorePp: { size: { w: "auto", h: "auto" }, anchor: "bottom-right", offset: { x: 24, y: 24 } },
  scoreBlPp: { size: { w: "auto", h: "auto" }, anchor: "bottom-right", offset: { x: 24, y: 24 } },
  pbDelta: { size: { w: "auto", h: "auto" }, anchor: "bottom-right", offset: { x: 24, y: 24 } },
  text: { size: { w: "auto", h: "auto" }, anchor: "top", offset: { x: 0, y: 24 } },
};

/** Creates a new element of the given widget type with its default placement. */
export function createOverlayElement(
  type: OverlayWidgetType,
  overrides: Partial<Pick<OverlayElement, "anchor" | "offset" | "size" | "scale" | "z">> = {}
): OverlayElement {
  const defaults = OVERLAY_WIDGET_DEFAULTS[type];
  const base = {
    id: crypto.randomUUID(),
    visible: true,
    locked: false,
    z: overrides.z ?? 0,
    anchor: overrides.anchor ?? defaults.anchor,
    offset: overrides.offset ?? defaults.offset,
    size: overrides.size ?? defaults.size,
    scale: overrides.scale ?? 1,
  };
  switch (type) {
    case OverlayWidgetTypes.PbDelta:
      return { ...base, type, options: { ...DEFAULT_PB_DELTA_OPTIONS } };
    case OverlayWidgetTypes.PlayerPp:
    case OverlayWidgetTypes.PlayerBlPp:
    case OverlayWidgetTypes.ScorePp:
    case OverlayWidgetTypes.ScoreBlPp:
      return { ...base, type, options: { showPlatform: true } };
    case OverlayWidgetTypes.Text:
      return { ...base, type, options: { text: "Text" } };
    default:
      return { ...base, type, options: {} };
  }
}

export function createBlankOverlayLayout(): OverlayLayout {
  return { version: 1, canvas: { w: OVERLAY_CANVAS_WIDTH, h: OVERLAY_CANVAS_HEIGHT }, elements: [] };
}

/** Deep copies a layout and gives every element a fresh id. */
export function cloneOverlayLayout(layout: OverlayLayout): OverlayLayout {
  const copy: OverlayLayout = structuredClone(layout);
  return { ...copy, elements: copy.elements.map(element => ({ ...element, id: crypto.randomUUID() })) };
}

function layoutOf(elements: OverlayElement[]): OverlayLayout {
  return {
    version: 1,
    canvas: { w: OVERLAY_CANVAS_WIDTH, h: OVERLAY_CANVAS_HEIGHT },
    elements: elements.map((element, index) => ({ ...element, z: index })),
  };
}

const T = OverlayWidgetTypes;

export const OVERLAY_PRESETS: OverlayPreset[] = [
  {
    id: "blank",
    name: "Blank",
    description: "An empty overlay.",
    layout: createBlankOverlayLayout(),
  },
  {
    id: "minimal",
    name: "Minimal",
    description: "Song info and your accuracy.",
    layout: layoutOf([
      createOverlayElement(T.SongInfo, { anchor: "bottom-left", offset: { x: 24, y: 24 } }),
      createOverlayElement(T.ScoreAccuracy, { anchor: "bottom-right", offset: { x: 24, y: 24 } }),
    ]),
  },
  {
    id: "player-card",
    name: "Player card",
    description: "Your avatar, name, ranks and medals.",
    layout: layoutOf([
      createOverlayElement(T.PlayerAvatar, { anchor: "top-left", offset: { x: 24, y: 24 } }),
      createOverlayElement(T.PlayerName, { anchor: "top-left", offset: { x: 140, y: 28 } }),
      createOverlayElement(T.PlayerRank, { anchor: "top-left", offset: { x: 140, y: 76 } }),
      createOverlayElement(T.PlayerCountryRank, { anchor: "top-left", offset: { x: 300, y: 76 } }),
      createOverlayElement(T.PlayerMedals, { anchor: "top-left", offset: { x: 440, y: 76 } }),
    ]),
  },
  {
    id: "full-hud",
    name: "Full HUD",
    description: "Player card, song info, score and PB delta.",
    layout: layoutOf([
      createOverlayElement(T.PlayerAvatar, { anchor: "top-left", offset: { x: 24, y: 24 } }),
      createOverlayElement(T.PlayerName, { anchor: "top-left", offset: { x: 140, y: 28 } }),
      createOverlayElement(T.PlayerRank, { anchor: "top-left", offset: { x: 140, y: 76 } }),
      createOverlayElement(T.PlayerCountryRank, { anchor: "top-left", offset: { x: 300, y: 76 } }),
      createOverlayElement(T.SongCover, { anchor: "bottom-left", offset: { x: 24, y: 24 } }),
      createOverlayElement(T.SongInfo, { anchor: "bottom-left", offset: { x: 168, y: 24 } }),
      createOverlayElement(T.ScoreAccuracy, { anchor: "bottom-right", offset: { x: 24, y: 24 } }),
      // Combo above the accuracy, the PB delta on the accuracy's left (x leaves room for the accuracy text)
      createOverlayElement(T.ScoreCombo, { anchor: "bottom-right", offset: { x: 24, y: 80 } }),
      createOverlayElement(T.PbDelta, { anchor: "bottom-right", offset: { x: 230, y: 27 } }),
    ]),
  },
];

export function getOverlayPreset(id: string): OverlayPreset | undefined {
  return OVERLAY_PRESETS.find(preset => preset.id === id);
}
