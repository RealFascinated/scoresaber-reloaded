import MedalsData from "@/components/medals/medals-data";

export const revalidate = 300; // Revalidate every 5 minutes

type Props = {
  params: Promise<{
    page: string;
  }>;
};

export default async function MedalsPage(props: Props) {
  const { page } = await props.params;
  const pageNumber = parseInt(page);

  return (
    <main className="flex w-full flex-col items-center text-sm">
      <MedalsData initialPage={pageNumber} />
    </main>
  );
}
