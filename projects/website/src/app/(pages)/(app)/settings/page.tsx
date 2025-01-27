import Card from "@/components/card";
import Settings from "@/components/settings/settings";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Settings",
  openGraph: {
    title: "ScoreSaber Reloaded - Settings",
    description: "Change or view your settings for ScoreSaber Reloaded",
  },
};

export default function SettingsPage() {
  return (
    <div className="flex w-full flex-col items-center">
      <Card className="w-full lg:max-w-[1200px] h-fit gap-4">
        <Settings />
      </Card>
    </div>
  );
}
