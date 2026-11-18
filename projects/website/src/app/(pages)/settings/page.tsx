import Settings from "@/components/settings/settings";

export async function generateMetadata() {
  return {
    title: "Settings",
    description: "Customize the site, scores, and player preferences.",
    alternates: {
      canonical: "/settings",
    },
  };
}

export default async function StatisticsPage() {
  return <Settings />;
}
