"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FaDiscord } from "react-icons/fa";

export default function DiscordBanner() {
  const pathName = usePathname();

  // Don't show the banner on the home page
  if (pathName === "/") {
    return null;
  }

  return (
    <Link
      href="https://discord.gg/kmNfWGA4A8"
      target="_blank"
      className="hover:opacity-80 transition-all bg-discord-blue rounded-md text-white px-4 py-1 flex items-center gap-2 justify-center"
    >
      <FaDiscord />
      <span>Join our Discord server</span>
    </Link>
  );
}
