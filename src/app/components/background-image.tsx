"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { config } from "../../../config";
import { getImageUrl } from "../common/image-utils";
import useDatabase from "../hooks/use-database";

export default function BackgroundImage() {
  const database = useDatabase();
  const settings = useLiveQuery(() => database.getSettings());

  if (settings?.backgroundImage == undefined || settings?.backgroundImage == "") {
    return null; // Don't render anything if the background image is not set
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={getImageUrl(config.siteUrl + "/" + settings?.backgroundImage)}
      alt="Background image"
      className={`absolute -z-50 object-cover w-screen h-screen blur-sm brightness-[33%] pointer-events-none select-none`}
    />
  );
}
