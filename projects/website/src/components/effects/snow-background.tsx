"use client";

import {Snowfall} from "react-snowfall";

export function SnowBackground() {
  return <div className="fixed -z-40 w-full h-full pointer-events-none select-none">
    <Snowfall />
  </div>
}