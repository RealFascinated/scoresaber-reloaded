import EditorAuthGate from "@/components/overlay-editor/editor-auth-gate";
import OverlayEditorLoader from "@/components/overlay-editor/overlay-editor-loader";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Overlay editor", robots: { index: false } };

export default async function OverlayEditorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <EditorAuthGate>
      <OverlayEditorLoader overlayId={id} />
    </EditorAuthGate>
  );
}
