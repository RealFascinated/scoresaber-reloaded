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
    <div className="fixed -z-40 w-full h-full pointer-events-none select-none">
      <Snowfall />
    </div>
  );
}
