import OverlayBuilder from "@/components/overlay/overlay-builder";
import { env } from "@ssr/common/env";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Overlay Builder",
  openGraph: {
    siteName: env.NEXT_PUBLIC_WEBSITE_NAME,
    title: "Overlay Builder",
    description: "Create an overlay for your stream!",
  },
};

export default async function OverlayPage() {
  return (
    <main className="flex w-full justify-center">
      <OverlayBuilder />
    </main>
  );
}
