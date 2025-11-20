"use client";

import { cn } from "@/common/utils";
import useDatabase from "@/hooks/use-database";
import { TimeUnit } from "@ssr/common/utils/time-utils";
import { useLiveQuery } from "dexie-react-hooks";
import { useEffect, useState } from "react";

const IMAGE_CHANGE_INTERVAL = TimeUnit.toMillis(TimeUnit.Second, 30);

type BackgroundCover = {
  name: string;
  id: string;
  type: "color" | "image" | "rotating-images";
  value?: string;
};

export const BACKGROUND_COVERS: BackgroundCover[] = [
  {
    name: "Default",
    id: "default",
    type: "image",
    value: "https://cdn.fascinated.cc/assets/backgrounds/purple-moon.jpg",
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
    name: "Rotating Images (Rotates between all images)",
    id: "rotating-images",
    type: "rotating-images",
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

export default function BackgroundCover() {
  const database = useDatabase();
  const backgroundCover = useLiveQuery(async () => database.getBackgroundCover());
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);

  const cover = BACKGROUND_COVERS.find(cover => cover.id === backgroundCover);

  // Initialize with random image if rotating images
  useEffect(() => {
    if (cover?.type === "rotating-images") {
      setCurrentImageIndex(Math.floor(Math.random() * ALL_IMAGES.length));
    }
  }, [cover?.type]);

  // Handle rotating images
  useEffect(() => {
    if (cover?.type === "rotating-images") {
      const interval = setInterval(() => {
        setIsTransitioning(true);
        setTimeout(() => {
          setCurrentImageIndex(prevIndex => {
            // Pick a random image that's different from the current one
            let newIndex;
            do {
              newIndex = Math.floor(Math.random() * ALL_IMAGES.length);
            } while (newIndex === prevIndex && ALL_IMAGES.length > 1);
            return newIndex;
          });
          setIsTransitioning(false);
        }, 500);
      }, IMAGE_CHANGE_INTERVAL);

      return () => clearInterval(interval);
    }
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
        style={{
          ...(cover.id !== "none" ? { backgroundColor: backgroundCover } : {}),
        }}
      />
    );
  }

  if (cover.type === "rotating-images") {
    return (
      <img
        src={ALL_IMAGES[currentImageIndex]}
        alt="Background image"
        fetchPriority="high"
        className={cn(
          "pointer-events-none fixed -z-50 h-screen w-screen object-cover blur-xs brightness-[50%] select-none",
          "transition-opacity duration-1000 ease-in-out",
          isTransitioning ? "opacity-10" : "opacity-100"
        )}
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
