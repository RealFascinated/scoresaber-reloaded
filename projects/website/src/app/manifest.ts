import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "ScoreSaber Reloaded",
    short_name: "SSR",
    description:
      "The ultimate platform for Beat Saber players. Track your progress, compete with friends, and discover detailed insights about your gameplay like never before.",
    start_url: "/",
    display: "standalone",
    background_color: "#000000",
    theme_color: "#000000",
    categories: ["scoresaber", "beatsaber"],
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
      },
      {
        src: "/icon-512x512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}
