"use client";

import { cn } from "@/common/utils";
import useDatabase from "@/hooks/use-database";
import { TimeUnit } from "@ssr/common/utils/time-utils";
import { useStableLiveQuery } from "@/hooks/use-stable-live-query";
import { useEffect, useState } from "react";

const IMAGE_CHANGE_INTERVAL = TimeUnit.toMillis(TimeUnit.Second, 30);
const TRANSITION_DURATION = 500;

type BackgroundCover = {
  name: string;
  id: string;
  type: "color" | "image" | "rotating-images" | "random";
  value?: string;
};

export const BACKGROUND_COVERS: BackgroundCover[] = [
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
    name: "Car Wreck",
    id: "car-wreck",
    type: "image",
    value: "https://cdn.fascinated.cc/assets/backgrounds/car-wreck.png",
  },
  {
    name: "Foggy Swamp",
    id: "foggy-swampland",
    type: "image",
    value: "https://cdn.fascinated.cc/assets/backgrounds/foggy-swampland.jpg",
  },
  {
    name: "Forest Trail",
    id: "forest-trail",
    type: "image",
    value: "https://cdn.fascinated.cc/assets/backgrounds/forest-trail.jpg",
  },
  {
    name: "Snowy Mountains",
    id: "snowy-mountains",
    type: "image",
    value: "https://cdn.fascinated.cc/assets/backgrounds/snowy-mountains.jpg",
  },
  {
    name: "Fantasy Mountains",
    id: "fantasy-mountains",
    type: "image",
    value: "https://cdn.fascinated.cc/assets/backgrounds/fantasy-mountains.jpg",
  },
  {
    name: "Rotating Backgrounds",
    id: "rotating-images",
    type: "rotating-images",
  },
  {
    name: "Random",
    id: "random",
    type: "random",
  },
  {
    name: "None",
    id: "none",
    type: "color",
    value: "transparent",
  },
];

const ALL_IMAGES = BACKGROUND_COVERS.filter(cover => cover.type === "image").map(
  cover => cover.value
);

const getRandomIndex = (excludeIndex?: number): number => {
  if (ALL_IMAGES.length === 0) return 0;
  if (ALL_IMAGES.length === 1) return 0;

  let newIndex: number;
  do {
    newIndex = Math.floor(Math.random() * ALL_IMAGES.length);
  } while (newIndex === excludeIndex && excludeIndex !== undefined);

  return newIndex;
};

export default function BackgroundCover() {
  const database = useDatabase();
  const backgroundCover = useStableLiveQuery(async () => database.getBackgroundCover());
  const [currentImageIndex, setCurrentImageIndex] = useState(() => getRandomIndex());
  const [isTransitioning, setIsTransitioning] = useState(false);
  const blur = useStableLiveQuery(async () => database.getBackgroundCoverBlur());
  const brightness = useStableLiveQuery(async () => database.getBackgroundCoverBrightness());

  const cover = BACKGROUND_COVERS.find(cover => cover.id === backgroundCover);

  // Initialize random index when cover type changes to rotating or random
  useEffect(() => {
    if (cover?.type === "rotating-images" || cover?.type === "random") {
      setCurrentImageIndex(getRandomIndex());
    }
  }, [cover?.type]);

  // Handle image rotation interval
  useEffect(() => {
    if (cover?.type !== "rotating-images") return;

    const interval = setInterval(() => {
      setIsTransitioning(true);
      setTimeout(() => {
        setCurrentImageIndex(prevIndex => getRandomIndex(prevIndex));
        setIsTransitioning(false);
      }, TRANSITION_DURATION);
    }, IMAGE_CHANGE_INTERVAL);

    return () => clearInterval(interval);
  }, [cover?.type]);

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
        style={cover.id !== "none" ? { backgroundColor: backgroundCover } : {}}
      />
    );
  }

  const imageUrl =
    cover.type === "rotating-images" || cover.type === "random"
      ? ALL_IMAGES[currentImageIndex]
      : cover.value;

  return (
    <img
      src={imageUrl}
      alt="Background image"
      fetchPriority="high"
      className={cn(
        "pointer-events-none fixed -z-50 h-screen w-screen object-cover select-none",
        cover.type === "rotating-images" && "transition-opacity duration-[1000ms] ease-in-out",
        cover.type === "rotating-images" && (isTransitioning ? "opacity-10" : "opacity-100")
      )}
      style={{
        filter: `blur(${blur}px) brightness(${brightness}%)`,
      }}
    />
  );
}
