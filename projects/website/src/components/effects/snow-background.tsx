"use client";

import { useUserPreference } from "@/hooks/use-user-preferences";

import dynamic from "next/dynamic";

const Snowfall = dynamic(() => import("react-snowfall").then(module => module.Snowfall), { ssr: false });

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
