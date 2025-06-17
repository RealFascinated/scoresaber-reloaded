"use client";

import useDatabase from "@/hooks/use-database";
import { useLiveQuery } from "dexie-react-hooks";
import { Snowfall } from "react-snowfall";

export function SnowBackground() {
  const database = useDatabase();
  const snowParticles = useLiveQuery(async () => database.getSnowParticles());

  if (!snowParticles) {
    return null;
  }

  return (
    <div className="pointer-events-none fixed -z-40 h-full w-full select-none">
      <Snowfall />
    </div>
  );
}
