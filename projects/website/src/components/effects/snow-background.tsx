"use client";

import { useUserPreference } from "@/hooks/use-user-preferences";

import { Snowfall } from "react-snowfall";

export function SnowBackground() {
  const snowParticles = useUserPreference("snowParticles");

  if (!snowParticles) {
    return null;
  }

  return (
    <div className="pointer-events-none fixed -z-40 h-full w-full select-none">
      <Snowfall />
    </div>
  );
}
