import Settings from "@/components/settings/settings";
import { Metadata } from "next";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Settings",
    description: "Customize the site, scores, and player preferences.",
  };
}

export default async function StatisticsPage() {
  return <Settings />;
}
