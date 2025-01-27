import Overlay from "@/components/overlay/overlay";
import { parseOverlaySettings } from "@/common/overlay/overlay-settings";
import { redirect } from "next/navigation";

type OverlayPageProps = {
  /**
   * The search params for the page.
   */
  searchParams: Promise<{
    /**
     * The raw settings for the overlay as base64.
     */
    settings: string;
  }>;
};

export default async function OverlayPage({ searchParams }: OverlayPageProps) {
  const params = await searchParams;

  // Redirect to the builder if no settings are provided
  if (!params.settings) {
    return redirect("/overlay/builder");
  }

  return (
    <main className="w-screen h-screen">
      <Overlay settings={parseOverlaySettings(params.settings)} />
    </main>
  );
}
