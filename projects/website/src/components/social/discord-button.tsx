import { Button } from "@/components/ui/button";
import Link from "next/link";

export function DiscordButton() {
  return (
    <Link prefetch={false} href="https://discord.gg/kmNfWGA4A8" target="_blank">
      <Button className="max-w-52 flex gap-2.5 bg-[#5865F2] hover:bg-[#5865F2]/85 text-white">
        <img className="size-6" src="/assets/logos/discord.svg" alt="Discord Logo" />
        <span>Join our Discord</span>
      </Button>
    </Link>
  );
}
