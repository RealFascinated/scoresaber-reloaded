import { Button } from "@/components/ui/button";
import { env } from "@ssr/common/env";
import Link from "next/link";

export default function PlayerButton({ playerId }: { playerId: string }) {
  return (
    <Link href={`${env.NEXT_PUBLIC_WEBSITE_URL}/player/${playerId}`}>
      <Button>View Player</Button>
    </Link>
  );
}
