"use client";

import Link from "next/link";
import { FaDiscord } from "react-icons/fa";
import { usePathname } from "next/navigation";

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
      className="hover:opacity-80 transform-gpu transition-all bg-discord-blue rounded-md text-white px-4 py-1 flex items-center gap-2 justify-center"
    >
      <FaDiscord />
      <span>Join our Discord server</span>
    </Link>
  );
}
