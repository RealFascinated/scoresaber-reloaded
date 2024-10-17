"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { getImageUrl } from "@/common/image-utils";
import useDatabase from "../hooks/use-database";
import { Config } from "@ssr/common/config";

export default function BackgroundCover() {
  const database = useDatabase();
  const settings = useLiveQuery(() => database.getSettings());

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
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={getImageUrl(backgroundCover)}
      alt="Background image"
      fetchPriority="high"
      className={`fixed -z-50 object-cover w-screen h-screen blur-sm brightness-[33%] pointer-events-none select-none`}
    />
  );
}
