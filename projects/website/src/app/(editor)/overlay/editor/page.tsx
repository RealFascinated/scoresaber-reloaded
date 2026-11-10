import EditorAuthGate from "@/components/overlay-editor/editor-auth-gate";
import OverlayPicker from "@/components/overlay-editor/overlay-picker";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Overlay editor", robots: { index: false } };

export default function OverlayEditorListPage() {
  return (
    <EditorAuthGate>
      <OverlayPicker />
    </EditorAuthGate>
  );
}
