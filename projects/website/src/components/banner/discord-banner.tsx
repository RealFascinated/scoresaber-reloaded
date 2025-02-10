import Link from "next/link";
import { FaDiscord } from "react-icons/fa";

export default function DiscordBanner() {
  return (
    <div className="bg-discord-blue rounded-md text-white px-4 py-1 flex items-center gap-2 justify-center">
      <FaDiscord />
      <Link
        href="https://discord.gg/kmNfWGA4A8"
        target="_blank"
        className="hover:opacity-80 transform-gpu transition-all"
      >
        <span>Join our Discord server</span>
      </Link>
    </div>
  );
}
