"use client";

import MockOverlayRuntime from "@/common/overlay/mock-overlay-runtime";
import OverlayStage from "@/components/overlay/overlay-stage";
import type { OverlayLayout } from "@ssr/common/schemas/overlay/overlay-layout";

/**
 * A small, non-interactive picture of a layout with mock data.
 */
export default function OverlayPreview({ layout }: { layout: OverlayLayout }) {
  return (
    <div className="bg-muted/60 pointer-events-none aspect-video w-full overflow-hidden rounded-lg">
      <MockOverlayRuntime scenario="inSong" playerId="">
        <OverlayStage layout={layout} />
      </MockOverlayRuntime>
    </div>
  );
}
