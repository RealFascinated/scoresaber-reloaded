"use client";

import {
  getMockOverlayData,
  MOCK_BL_PLAYER,
  MOCK_PB,
  MOCK_PLAYER,
  MOCK_RATINGS,
  type MockScenario,
} from "@/common/overlay/mock/mock-overlay-data";
import { OverlayRuntimeContext } from "@/common/overlay/overlay-runtime";
import { useOverlayPlayer } from "@/common/overlay/use-overlay-queries";
import { ReactNode, useEffect, useMemo, useState } from "react";

type MockOverlayRuntimeProps = {
  scenario: MockScenario;
  /** The player of the overlay, shown instead of the fake player when it can be loaded. */
  playerId: string;
  children: ReactNode;
};

/**
 * Feeds the widgets with fake data, so an overlay can be edited without the game running.
 */
export default function MockOverlayRuntime({ scenario, playerId, children }: MockOverlayRuntimeProps) {
  const { player } = useOverlayPlayer(playerId);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (scenario !== "playing") {
      return;
    }
    const startedAt = Date.now();
    const interval = setInterval(() => setElapsed((Date.now() - startedAt) / 1000), 250);
    return () => clearInterval(interval);
  }, [scenario]);

  const runtime = useMemo(
    () => ({
      data: getMockOverlayData(scenario, elapsed),
      player: player ?? MOCK_PLAYER,
      pb: scenario === "menu" ? undefined : MOCK_PB,
      blPlayer: MOCK_BL_PLAYER,
      ratings: scenario === "menu" ? undefined : MOCK_RATINGS,
      // The menu shows what stream shows: widgets without data are hidden, not outlined
      editing: scenario !== "menu",
    }),
    [scenario, elapsed, player]
  );
  return <OverlayRuntimeContext value={runtime}>{children}</OverlayRuntimeContext>;
}
