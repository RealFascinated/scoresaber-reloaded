import OverlayBuilder from "@/components/overlay/overlay-builder";
import Card from "@/components/card";

export default async function OverlayPage() {
  // Show the overlay builder
  return (
    <main className="w-full h-full flex justify-center">
      <Card className="flex h-fit w-full md:w-3/4">
        <OverlayBuilder />
      </Card>
    </main>
  );
}
