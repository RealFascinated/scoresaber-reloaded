import { parseOverlaySettings } from "@/common/overlay/overlay-settings";
import Overlay from "@/components/overlay/overlay";
import { redirect } from "next/navigation";

type OverlayPageProps = {
  searchParams: Promise<{
    /**
     * The raw settings for the overlay as base64.
     */
    settings: string;
  }>;
};

export default async function OverlayPage({ searchParams }: OverlayPageProps) {
  const params = await searchParams;

  if (!params.settings) {
    return redirect("/overlay/builder");
  }

  return (
    <section className="h-screen w-screen">
      <Overlay settings={parseOverlaySettings(params.settings)} />
    </section>
  );
}
