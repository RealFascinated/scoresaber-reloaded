"use client";

import LiveOverlayRuntime from "@/common/overlay/live-overlay-runtime";
import { useOverlayLive } from "@/common/overlay/use-overlay-live";
import OverlayStage from "@/components/overlay/overlay-stage";
import type { OverlayContent } from "@ssr/common/schemas/response/user/overlay";

type OverlayViewerProps = {
  overlayId: string;
  initial: OverlayContent;
};

/**
 * The overlay as OBS shows it: live data, a transparent background and layout changes pushed from the editor.
 */
export default function OverlayViewer({ overlayId, initial }: OverlayViewerProps) {
  const content = useOverlayLive(overlayId, initial);
  if (!content) {
    return null;
  }

  return (
    <LiveOverlayRuntime settings={content.settings}>
      <OverlayStage layout={content.layout} />
    </LiveOverlayRuntime>
  );
}
