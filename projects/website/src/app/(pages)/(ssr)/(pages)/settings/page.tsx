import Card from "@/components/card";
import Settings from "@/components/settings/settings";
import { Config } from "@ssr/common/config";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Settings",
  openGraph: {
    siteName: Config.websiteName,
    title: "Settings",
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
