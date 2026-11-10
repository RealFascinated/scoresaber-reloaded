import { fetchOverlayContent } from "@/common/overlay/overlay-api";
import { parseOverlaySettings } from "@/common/overlay/overlay-settings";
import OverlayLegacy from "@/components/overlay-legacy/overlay-legacy";
import OverlayViewer from "@/components/overlay/overlay-viewer";
import { notFound, redirect } from "next/navigation";

type OverlayPageProps = {
  searchParams: Promise<{
    /**
     * The id of a saved overlay.
     */
    id?: string;
    /**
     * The raw settings for the legacy overlay as base64.
     */
    settings?: string;
  }>;
};

export default async function OverlayPage({ searchParams }: OverlayPageProps) {
  const params = await searchParams;

  if (params.id) {
    const content = await fetchOverlayContent(params.id).catch(() => undefined);
    if (!content) {
      return notFound();
    }
    return (
      <section className="size-full">
        <OverlayViewer overlayId={params.id} initial={content} />
      </section>
    );
  }

  if (!params.settings) {
    return redirect("/overlay/editor");
  }

  return (
    <section className="size-full">
      <OverlayLegacy settings={parseOverlaySettings(params.settings)} />
    </section>
  );
}
