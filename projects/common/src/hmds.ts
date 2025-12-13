export type HMD =
  | "Unknown"
  | "Rift CV1"
  | "Vive"
  | "Vive Pro"
  | "Vive Pro 2"
  | "HTC Vive Elite"
  | "Windows Mixed Reality"
  | "Rift S"
  | "Quest"
  | "Quest 2"
  | "Quest Pro"
  | "Quest 3"
  | "Quest 3S"
  | "Valve Index"
  | "Vive Cosmos"
  | "Bigscreen Beyond";

export type HMDInfo = {
  logo: string;
  filters?: string;
};

export const HMDs: Record<HMD, HMDInfo> = {
  Unknown: {
    logo: "unknown.svg",
    filters: "invert(100%)",
  },

  // SteamVR
  Vive: {
    logo: "vive.svg",
    filters: "invert(54%) sepia(78%) saturate(2598%) hue-rotate(157deg) brightness(97%) contrast(101%)",
  },
  "Vive Cosmos": {
    logo: "vive.svg",
    filters: "invert(11%) sepia(100%) saturate(7426%) hue-rotate(297deg) brightness(85%) contrast(109%)",
  },
  "Vive Pro": {
    logo: "vive.svg",
    filters: "invert(99%) sepia(3%) saturate(82%) hue-rotate(58deg) brightness(118%) contrast(100%)",
  },
  "Vive Pro 2": {
    logo: "vive.svg",
    filters: "invert(79%) sepia(68%) saturate(5755%) hue-rotate(232deg) brightness(90%) contrast(109%)",
  },
  "HTC Vive Elite": {
    logo: "vive.svg",
    filters: "invert(79%) sepia(68%) saturate(5755%) hue-rotate(232deg) brightness(90%) contrast(109%)",
  },
  "Valve Index": {
    logo: "index.svg",
    filters: "invert(81%) sepia(27%) saturate(6288%) hue-rotate(344deg) brightness(103%) contrast(103%)",
  },
  "Bigscreen Beyond": {
    logo: "bigscreen.svg",
    filters: "",
  },

  // Windows Mixed Reality
  "Windows Mixed Reality": {
    logo: "wmr.svg",
    filters: "invert(34%) sepia(67%) saturate(7482%) hue-rotate(193deg) brightness(103%) contrast(101%)",
  },

  // Quest / Meta
  "Rift CV1": {
    logo: "oculus.svg",
    filters: "invert(99%) sepia(3%) saturate(82%) hue-rotate(58deg) brightness(118%) contrast(100%)",
  },
  "Rift S": {
    logo: "oculus.svg",
    filters: "invert(96%) sepia(9%) saturate(5456%) hue-rotate(170deg) brightness(100%) contrast(107%)",
  },
  Quest: {
    logo: "oculus.svg",
    filters: "invert(73%) sepia(55%) saturate(5479%) hue-rotate(271deg) brightness(106%) contrast(107%)",
  },
  "Quest 2": {
    logo: "oculus.svg",
    filters: "invert(49%) sepia(26%) saturate(5619%) hue-rotate(146deg) brightness(93%) contrast(86%)",
  },
  "Quest Pro": {
    logo: "oculus.svg",
    filters: "",
  },
  "Quest 3": {
    logo: "meta.svg",
    filters: "invert(49%) sepia(26%) saturate(5619%) hue-rotate(260deg) brightness(93%) contrast(86%)",
  },
  "Quest 3S": {
    logo: "meta.svg",
    filters: "invert(49%) sepia(26%) saturate(5619%) hue-rotate(125deg) brightness(93%) contrast(86%)",
  },
};

/**
 * Gets the HMD info for a HMD.
 *
 * @param hmd the HMD to get the info for
 * @returns the HMD info
 */
export const getHMDInfo = (hmd: HMD) => {
  return HMDs[hmd] ?? HMDs["Unknown"];
};
