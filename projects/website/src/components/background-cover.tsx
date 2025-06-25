"use client";

import { cn } from "@/common/utils";
import useDatabase from "@/hooks/use-database";
import { useLiveQuery } from "dexie-react-hooks";

type BackgroundCover = {
  name: string;
  id: string;
  type: "color" | "image";
  value?: string;
};

export const BACKGROUND_COVERS: BackgroundCover[] = [
  {
    name: "Default",
    id: "default",
    type: "image",
    value: "https://cdn.fascinated.cc/assets/background.jpg",
  },
  {
    name: "Forest",
    id: "forest",
    type: "image",
    value: "https://cdn.fascinated.cc/assets/backgrounds/forest.jpg",
  },
  {
    name: "Alone",
    id: "alone",
    type: "image",
    value: "https://cdn.fascinated.cc/assets/backgrounds/alone.jpg",
  },
  {
    name: "Car Wreck (Dark)",
    id: "car-wreck",
    type: "image",
    value: "https://cdn.fascinated.cc/assets/backgrounds/car-wreck.png",
  },
  {
    name: "None",
    id: "none",
    type: "color",
    value: "transparent",
  },
];

export default function BackgroundCover() {
  const database = useDatabase();
  const backgroundCover = useLiveQuery(async () => database.getBackgroundCover());

  const cover =
    BACKGROUND_COVERS.find(cover => cover.id === backgroundCover) ?? BACKGROUND_COVERS[0];
  if (!cover) {
    return null;
  }

  if (cover.type === "color") {
    return (
      <div
        className={cn(
          "pointer-events-none fixed -z-50 h-screen w-screen object-cover select-none",
          cover.id === "none" ? "bg-background" : ""
        )}
        style={{
          ...(cover.id !== "none" ? { backgroundColor: backgroundCover } : {}),
        }}
      />
    );
  }

  return (
    <img
      src={cover.value}
      alt="Background image"
      fetchPriority="high"
      className={`pointer-events-none fixed -z-50 h-screen w-screen object-cover blur-xs brightness-[50%] select-none`}
    />
  );
}
