import Settings from "@/components/settings/settings";
import { Metadata } from "next";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: `Settings`,
    description: "Configure your settings",
  };
}

export default async function StatisticsPage() {
  return <Settings />;
}
