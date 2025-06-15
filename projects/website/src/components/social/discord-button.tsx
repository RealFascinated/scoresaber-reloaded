import { Button } from "@/components/ui/button";
import Image from "next/image";
import Link from "next/link";

export function DiscordButton() {
  return (
    <Link href="https://discord.gg/kmNfWGA4A8" target="_blank">
      <Button className="max-w-52 flex gap-2.5 bg-[#5865F2] hover:bg-[#5865F2]/85 text-white">
        <Image
          className="size-6"
          src="https://cdn.fascinated.cc/assets/logos/discord.svg"
          alt="Discord Logo"
          width={24}
          height={24}
        />
        <span>Join our Discord</span>
      </Button>
    </Link>
  );
}
