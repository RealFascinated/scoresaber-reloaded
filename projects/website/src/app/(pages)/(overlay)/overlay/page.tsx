import Overlay from "@/components/overlay/overlay";

type OverlayPageProps = {
  searchParams: Promise<{
    settings: string;
  }>;
};

export default async function OverlayPage({ searchParams }: OverlayPageProps) {
  const params = await searchParams;

  if (params.settings) {
    const settings = JSON.parse(params.settings);

    return (
      <main className="w-screen h-screen">
        <Overlay settings={settings} />
      </main>
    );
  }

  return <p>overlay builder</p>;
}
