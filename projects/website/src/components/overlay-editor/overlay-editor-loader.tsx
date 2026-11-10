"use client";

import OverlayEditor from "@/components/overlay-editor/overlay-editor";
import { useUserOverlay } from "@/hooks/use-user-overlays";
import Link from "next/link";

export default function OverlayEditorLoader({ overlayId }: { overlayId: string }) {
  const { data: overlay, isLoading, error } = useUserOverlay(overlayId);

  if (isLoading) {
    return <div className="text-muted-foreground flex h-screen items-center justify-center">Loading…</div>;
  }
  if (error || !overlay) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-2">
        <p>Could not open this overlay{error ? `: ${error.message}` : ""}.</p>
        <Link href="/overlay/editor" className="text-primary underline">
          Back to your overlays
        </Link>
      </div>
    );
  }
  return <OverlayEditor overlay={overlay} />;
}
