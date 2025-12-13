import SimpleLink from "@/components/simple-link";
import { Button } from "@/components/ui/button";
import { env } from "@ssr/common/env";

export default function PlayerButton({ playerId }: { playerId: string }) {
  return (
    <SimpleLink href={`${env.NEXT_PUBLIC_WEBSITE_URL}/player/${playerId}`}>
      <Button>View Player</Button>
    </SimpleLink>
  );
}
