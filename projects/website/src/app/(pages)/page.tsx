import { Button } from "@/components/ui/button";
import Link from "next/link";
import ky from "ky";
import { config } from "../../../config";
import { AppStatistics } from "@ssr/common/types/backend/app-statistics";
import Statistic from "@/components/home/statistic";

export default async function HomePage() {
  const statistics = await ky.get(config.siteApi + "/statistics").json<AppStatistics>();

  return (
    <main className="flex flex-col items-center w-full gap-6 text-center">
      <div className="flex items-center flex-col">
        <p className="font-semibold text-2xl">ScoreSaber Reloaded</p>
        <p className="text-center">Welcome to the ScoreSaber Reloaded website.</p>
      </div>

      <div className="flex items-center flex-col">
        <p>ScoreSaber Reloaded is a website that allows you to track your ScoreSaber data over time.</p>
      </div>

      <div className="flex items-center flex-col">
        <p className="font-semibold">Site Statistics</p>
        <Statistic title="Total Tracked Players" value={statistics.trackedPlayers} />
      </div>

      <Link href="/search">
        <Button className="w-fit">Get started</Button>
      </Link>
    </main>
  );
}
