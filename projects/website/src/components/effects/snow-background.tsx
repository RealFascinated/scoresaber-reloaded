"use client";

import { Snowfall } from "react-snowfall";
import useSettings from "@/hooks/use-settings";

export function SnowBackground() {
  const settings = useSettings();
  if (!settings.getSnowParticles()) {
    return null;
  }

  return (
    <div className="fixed -z-40 w-full h-full pointer-events-none select-none">
      <Snowfall />
    </div>
  );
}
