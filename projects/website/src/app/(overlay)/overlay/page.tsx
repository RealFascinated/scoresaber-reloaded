import { parseOverlaySettings } from "@/common/overlay/overlay-settings";
import Overlay from "@/components/overlay/overlay";
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
    <main className="h-screen w-screen">
      <Overlay settings={parseOverlaySettings(params.settings)} />
    </main>
  );
}
