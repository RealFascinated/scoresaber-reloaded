import { AppStats } from "@/components/app-statistics";
import { env } from "@ssr/common/env";
import { AppStatistics } from "@ssr/common/types/backend/app-statistics";
import Request from "@ssr/common/utils/request";
import { ChartNoAxesCombined } from "lucide-react";

export default async function SiteStats() {
  const statistics = await Request.get<AppStatistics>(env.NEXT_PUBLIC_API_URL + "/statistics");

  return (
    <div id="stats" className="-mt-20 flex flex-col gap-10 px-5 select-none">
      {/* Header */}
      <div className="flex flex-col gap-2.5">
        <div className="flex items-center gap-3 text-orange-600">
          <ChartNoAxesCombined className="size-10 rounded-lg bg-orange-800/15 p-2" />
          <h1 className="text-2xl font-bold sm:text-3xl">Site Statistics</h1>
        </div>
        <p className="max-w-5xl opacity-85">
          Discover insights into our community’s activity with real-time site statistics, showcasing
          the total scores set, additional scores data, and more.
        </p>
      </div>

      {/* Content */}
      {statistics && <AppStats initialStatistics={statistics} />}
    </div>
  );
}
