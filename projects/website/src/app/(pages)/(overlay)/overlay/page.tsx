import Overlay from "@/components/overlay/overlay";
import { parseOverlaySettings } from "@/common/overlay/overlay-settings";
import OverlayBuilder from "@/components/overlay/overlay-builder";

type OverlayPageProps = {
  /**
   * The search params for the page.
   */
  searchParams: Promise<{
    /**
     * The raw settings for the overlay.
     */
    settings: string;
  }>;
};

export default async function OverlayPage({ searchParams }: OverlayPageProps) {
  const params = await searchParams;

  // Show the overlay if settings are provided
  if (params.settings) {
    return (
      <main className="w-screen h-screen">
        <Overlay settings={parseOverlaySettings(params.settings)} />
      </main>
    );
  }

  // Show the overlay builder
  return (
    <main className="w-screen h-screen">
      <OverlayBuilder />
    </main>
  );
}
