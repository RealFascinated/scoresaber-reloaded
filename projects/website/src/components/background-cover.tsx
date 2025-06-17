"use client";

import useDatabase from "@/hooks/use-database";
import { useLiveQuery } from "dexie-react-hooks";
import Image from "next/image";

export default function BackgroundCover() {
  const database = useDatabase();
  const backgroundCover = useLiveQuery(async () => database.getBackgroundCover());

  if (backgroundCover == undefined || backgroundCover == "") {
    return null; // Don't render anything if the background image is not set
  }

  // Static background color
  if (backgroundCover.startsWith("#")) {
    return (
      <div
        className={`pointer-events-none fixed -z-50 h-screen w-screen object-cover select-none`}
        style={{ backgroundColor: backgroundCover }}
      />
    );
  }

  return (
    <Image
      src={backgroundCover}
      alt="Background image"
      fetchPriority="high"
      className={`pointer-events-none fixed -z-50 h-screen w-screen object-cover blur-xs brightness-[33%] select-none`}
      width={1920}
      height={1080}
    />
  );
}
