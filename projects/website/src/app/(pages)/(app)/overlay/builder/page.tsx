import OverlayBuilder from "@/components/overlay/overlay-builder";
import Card from "@/components/card";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Overlay Builder",
  openGraph: {
    title: "ScoreSaber Reloaded - Overlay Builder",
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
