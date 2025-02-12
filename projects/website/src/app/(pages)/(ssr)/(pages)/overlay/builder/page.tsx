import Card from "@/components/card";
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
    <main className="w-full h-full flex justify-center">
      <Card className="flex h-fit w-full md:w-3/4">
        <OverlayBuilder />
      </Card>
    </main>
  );
}
