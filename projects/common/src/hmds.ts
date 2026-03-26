import { z } from "zod";

export const HmdSchema = z.enum([
  "Unknown",
  "Rift CV1",
  "Vive",
  "Vive Pro",
  "Vive Pro 2",
  "HTC Vive Elite",
  "HP Reverb G2",
  "Windows Mixed Reality",
  "Windows MR",
  "Rift S",
  "Quest",
  "Quest (Virtual Desktop)",
  "Quest 1",
  "Quest 2",
  "Quest 2 (Virtual Desktop)",
  "Quest Pro",
  "Quest 3",
  "Quest 3S",
  "Valve Index",
  "Vive Cosmos",
  "Bigscreen Beyond",
  "PICO 4",
  "PICO 4S",
  "Pico Neo 2",
  "Pico Neo 3",
  "PSVR2",
]);
export type HMD = z.infer<typeof HmdSchema>;

export type HMDInfo = {
  logo: string;
  filters?: string;
};

/**
 * HMD display metadata definitions.
 *
 * Each entry defines a "root" HMD plus optional aliases which share the same
 * icon/filters without duplicating the values in this file.
 */
const HMD_DEFINITIONS = [
  {
    hmd: "Unknown",
    info: { logo: "unknown.svg", filters: "invert(100%)" },
  },

  // SteamVR
  {
    hmd: "Vive",
    info: {
      logo: "vive.svg",
      filters: "invert(54%) sepia(78%) saturate(2598%) hue-rotate(157deg) brightness(97%) contrast(101%)",
    },
  },
  {
    hmd: "Vive Cosmos",
    info: {
      logo: "vive.svg",
      filters: "invert(11%) sepia(100%) saturate(7426%) hue-rotate(297deg) brightness(85%) contrast(109%)",
    },
  },
  {
    hmd: "Vive Pro",
    info: {
      logo: "vive.svg",
      filters: "invert(99%) sepia(3%) saturate(82%) hue-rotate(58deg) brightness(118%) contrast(100%)",
    },
  },
  {
    hmd: "Vive Pro 2",
    aliases: ["HTC Vive Elite"],
    info: {
      logo: "vive.svg",
      filters: "invert(79%) sepia(68%) saturate(5755%) hue-rotate(232deg) brightness(90%) contrast(109%)",
    },
  },
  {
    hmd: "Valve Index",
    info: {
      logo: "index.svg",
      filters: "invert(81%) sepia(27%) saturate(6288%) hue-rotate(344deg) brightness(103%) contrast(103%)",
    },
  },
  {
    hmd: "Bigscreen Beyond",
    info: { logo: "bigscreen.svg" },
  },

  // HP
  {
    hmd: "HP Reverb G2",
    info: {
      logo: "hp.webp",
      filters: "invert(99%) sepia(3%) saturate(82%) hue-rotate(58deg) brightness(118%) contrast(100%)"
    },
  },

  // Windows Mixed Reality
  {
    hmd: "Windows Mixed Reality",
    aliases: ["Windows MR"],
    info: {
      logo: "wmr.svg",
      filters: "invert(34%) sepia(67%) saturate(7482%) hue-rotate(193deg) brightness(103%) contrast(101%)",
    },
  },

  // Quest / Meta
  {
    hmd: "Rift CV1",
    info: {
      logo: "oculus.svg",
      filters: "invert(99%) sepia(3%) saturate(82%) hue-rotate(58deg) brightness(118%) contrast(100%)",
    },
  },
  {
    hmd: "Rift S",
    info: {
      logo: "oculus.svg",
      filters: "invert(96%) sepia(9%) saturate(5456%) hue-rotate(170deg) brightness(100%) contrast(107%)",
    },
  },
  {
    hmd: "Quest",
    aliases: ["Quest 1", "Quest (Virtual Desktop)"],
    info: {
      logo: "oculus.svg",
      filters: "invert(73%) sepia(55%) saturate(5479%) hue-rotate(271deg) brightness(106%) contrast(107%)",
    },
  },
  {
    hmd: "Quest 2",
    aliases: ["Quest 2 (Virtual Desktop)"],
    info: {
      logo: "oculus.svg",
      filters: "invert(49%) sepia(26%) saturate(5619%) hue-rotate(146deg) brightness(93%) contrast(86%)",
    },
  },
  {
    hmd: "Quest Pro",
    info: { logo: "oculus.svg" },
  },
  {
    hmd: "Quest 3",
    info: {
      logo: "meta.svg",
      filters: "invert(49%) sepia(26%) saturate(5619%) hue-rotate(260deg) brightness(93%) contrast(86%)",
    },
  },
  {
    hmd: "Quest 3S",
    info: {
      logo: "meta.svg",
      filters: "invert(49%) sepia(26%) saturate(5619%) hue-rotate(125deg) brightness(93%) contrast(86%)",
    },
  },

  // Pico
  {
    hmd: "PICO 4",
    aliases: ["Pico Neo 3", "Pico Neo 2", "PICO 4S"],
    info: {
      logo: "piconeo.webp",
      filters: "invert(99%) sepia(3%) saturate(82%) hue-rotate(58deg) brightness(118%) contrast(100%)",
    },
  },

  // PSVR
  {
    hmd: "PSVR2",
    info: {
      logo: "psvr2.svg",
    },
  },
] satisfies ReadonlyArray<{
  hmd: HMD;
  aliases?: ReadonlyArray<HMD>;
  info: HMDInfo;
}>;

export const HMDs: Record<HMD, HMDInfo> = Object.fromEntries(
  HMD_DEFINITIONS.flatMap(({ hmd, aliases, info }) => [
    [hmd.toLowerCase(), info],
    ...(aliases?.map(alias => [alias.toLowerCase(), info]) ?? []),
  ])
) as Record<HMD, HMDInfo>;

/** Runtime keys are lowercase; use this when lookup misses (unknown device string, missing field). */
const DEFAULT_HMD_INFO = HMD_DEFINITIONS[0].info;

/**
 * Gets the HMD info for a HMD.
 *
 * @param hmd the HMD to get the info for
 * @returns the HMD info
 */
export const getHMDInfo = (hmd: HMD | string | undefined | null): HMDInfo => {
  const key = String(hmd ?? "Unknown").toLowerCase();
  const info = (HMDs as Record<string, HMDInfo | undefined>)[key];
  return info ?? DEFAULT_HMD_INFO;
};
