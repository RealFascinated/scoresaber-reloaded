import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "ScoreSaber Reloaded",
    short_name: "SSR",
    description:
      "The ultimate platform for Beat Saber players. Track your progress, compete with friends, and discover detailed insights about your gameplay like never before.",
    start_url: "/",
    scope: "/",
    display: "minimal-ui",
    orientation: "portrait-primary",
    lang: "en",
    dir: "ltr",
    categories: ["scoresaber", "beatsaber", "games", "entertainment"],
    screenshots: [
      {
        src: "https://cdn.fascinated.cc/xmvzAW.png",
        sizes: "2500x1270",
        type: "image/png",
        form_factor: "wide",
      },
      {
        src: "https://cdn.fascinated.cc/NdniRT.png",
        sizes: "446x994",
        type: "image/png",
        form_factor: "narrow",
      },
    ],
    icons: [
      {
        src: "/icon-192x192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
    ],
  };
}
