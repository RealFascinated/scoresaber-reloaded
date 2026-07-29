import SimpleLink from "@/components/simple-link";
import { Button } from "@/components/ui/button";
import Image from "next/image";

export function DiscordButton() {
  return (
    <SimpleLink href="https://discord.gg/kmNfWGA4A8" target="_blank">
      <Button variant="outline" size="lg" className="gap-2 rounded-xl px-6 font-semibold">
        <Image className="size-4" src="/assets/logos/discord.svg" alt="" width={16} height={16} />
        Join Discord
      </Button>
    </SimpleLink>
  );
}
