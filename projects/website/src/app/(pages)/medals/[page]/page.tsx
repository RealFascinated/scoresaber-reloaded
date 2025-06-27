import MedalsData from "@/components/medals/medals-data";
import { env } from "@ssr/common/env";
import { Metadata } from "next";

export const revalidate = 300; // Revalidate every 5 minutes

type MedalProps = {
  params: Promise<{
    page: string;
  }>;
};

const getMedalsData = async ({
  params,
}: MedalProps): Promise<{
  page: number;
}> => {
  const { page } = await params;
  const pageNumber = parseInt(page);

  return { page: pageNumber };
};

export async function generateMetadata(props: MedalProps): Promise<Metadata> {
  const { page } = await getMedalsData(props);

  const title = `Medals / ${page}`;
  return {
    title: title,
    openGraph: {
      siteName: env.NEXT_PUBLIC_WEBSITE_NAME,
      title: title,
      description: `View the players with the most medals!`,
    },
  };
}

export default async function MedalsPage(props: MedalProps) {
  const { page } = await getMedalsData(props);

  return (
    <main className="flex w-full flex-col items-center text-sm">
      <MedalsData initialPage={page} />
    </main>
  );
}
