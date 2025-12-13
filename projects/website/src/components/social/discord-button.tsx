import SimpleLink from "@/components/simple-link";
import { Button } from "@/components/ui/button";
import Image from "next/image";

export function DiscordButton() {
  return (
    <SimpleLink href="https://discord.gg/kmNfWGA4A8" target="_blank">
      <Button variant="ghost" className="border-border gap-2 bg-[#5865F2]/65 text-white hover:border-[#5865F2]/80">
        <Image
          className="size-6"
          src="https://cdn.fascinated.cc/assets/logos/discord.svg"
          alt="Discord Logo"
          width={24}
          height={24}
        />
        <span>Join our Discord</span>
      </Button>
    </SimpleLink>
  );
}
