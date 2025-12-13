import { Button } from "@/components/ui/button";
import { env } from "@ssr/common/env";
import Link from "next/link";

export default function LeaderboardButton({ leaderboardId }: { leaderboardId: number }) {
  return (
    <Link href={`${env.NEXT_PUBLIC_WEBSITE_URL}/leaderboard/${leaderboardId}`}>
      <Button>View Leaderboard</Button>
    </Link>
  );
}
