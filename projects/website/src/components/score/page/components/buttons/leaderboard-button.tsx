import SimpleLink from "@/components/simple-link";
import { Button } from "@/components/ui/button";
import { env } from "@ssr/common/env";

export default function LeaderboardButton({ leaderboardId }: { leaderboardId: number }) {
  return (
    <SimpleLink href={`${env.NEXT_PUBLIC_WEBSITE_URL}/leaderboard/${leaderboardId}`}>
      <Button>View Leaderboard</Button>
    </SimpleLink>
  );
}
