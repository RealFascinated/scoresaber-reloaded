"use client";

import { Config } from "@ssr/common/config";
import useSettings from "@/hooks/use-settings";

export default function BackgroundCover() {
  const settings = useSettings();

  if (settings == undefined || settings?.backgroundCover == undefined || settings?.backgroundCover == "") {
    return null; // Don't render anything if the background image is not set
  }

  let backgroundCover = settings.backgroundCover;
  let prependWebsiteUrl = false;

  // Remove the prepending slash
  if (backgroundCover.startsWith("/")) {
    prependWebsiteUrl = true;
    backgroundCover = backgroundCover.substring(1);
  }
  if (prependWebsiteUrl) {
    backgroundCover = Config.websiteUrl + "/" + backgroundCover;
  }

  // Static background color
  if (backgroundCover.startsWith("#")) {
    return (
      <div
        className={`fixed -z-50 object-cover w-screen h-screen pointer-events-none select-none`}
        style={{ backgroundColor: backgroundCover }}
      />
    );
  }

  return (
    <img
      src={backgroundCover}
      alt="Background image"
      fetchPriority="high"
      className={`fixed -z-50 object-cover w-screen h-screen blur-sm brightness-[33%] pointer-events-none select-none`}
    />
  );
}
