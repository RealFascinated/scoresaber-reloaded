import OverlayBuilder from "@/components/overlay/overlay-builder";
import { PageTitle } from "@/components/page-title";
import { env } from "@ssr/common/env";
import { ssrConfig } from "config";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Overlay Builder",
  openGraph: {
    siteName: env.NEXT_PUBLIC_WEBSITE_NAME ?? ssrConfig.siteName,
    title: "Overlay Builder",
    description: "Create an overlay for your stream!",
    images: ["/icon-512x512.png"],
  },
};

export default async function OverlayPage() {
  return (
    <div className="flex w-full flex-col gap-4">
      <PageTitle title="Overlay Builder" description="Create an overlay for your stream!" />
      <OverlayBuilder />
    </div>
  );
}
