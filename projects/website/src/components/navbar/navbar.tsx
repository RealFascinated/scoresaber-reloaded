"use client";

import { cn } from "@/common/utils";
import FriendsButton from "@/components/friend/friends-button";
import PlayerAndLeaderboardSearch from "@/components/navbar/player-and-leaderboard-search";
import ProfileButton from "@/components/navbar/profile-button";
import { CubeIcon } from "@heroicons/react/24/solid";
import { ChartBarIcon, MusicIcon, TrendingUpIcon } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { ReactElement, useEffect, useState } from "react";
import { FaDiscord } from "react-icons/fa";
import Settings from "../settings/settings";

const links: ReactElement<any>[] = [
  <FriendsButton key="friends" />,
  <SimpleNavLink
    key="ranking"
    content={
      <>
        <TrendingUpIcon className="size-5" />
        <span className="hidden xl:flex">Ranking</span>
      </>
    }
    href="/ranking"
  />,
  <SimpleNavLink
    key="statistics"
    content={
      <>
        <ChartBarIcon className="size-5" />
        <span className="hidden xl:flex">Statistics</span>
      </>
    }
    href="/statistics/scoresaber"
  />,
  <SimpleNavLink
    key="maps"
    content={
      <>
        <MusicIcon className="size-5" />
        <span className="hidden xl:flex">Maps</span>
      </>
    }
    href="/maps"
  />,
  <SimpleNavLink
    key="overlay"
    content={
      <>
        <CubeIcon className="size-5" />
        <span className="hidden xl:flex">Overlay</span>
      </>
    }
    href="/overlay/builder"
  />,
];

export default function Navbar() {
  const [hasScrolled, setHasScrolled] = useState<boolean>(false);

  useEffect(() => {
    const handleScroll = () => {
      const isScrolled = window.scrollY > 20;
      if (isScrolled !== hasScrolled) {
        setHasScrolled(isScrolled);
      }
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [hasScrolled]);

  return (
    <div className="flex flex-col">
      {/* Discord Ad */}
      <Link
        prefetch={false}
        href="https://discord.gg/kmNfWGA4A8"
        target="_blank"
        className="hover:opacity-80 transition-all bg-discord-blue text-white px-4 py-1 flex items-center gap-2 justify-center"
      >
        <FaDiscord />
        <span>Join our Discord server</span>
      </Link>

      {/* Navbar */}
      <nav
        className={cn(
          "sticky inset-x-0 top-0 w-full px-2 xs:px-5 py-1 flex justify-between lg:justify-around h-12 items-center backdrop-blur-md border-b border-muted/50 select-none z-50",
          hasScrolled ? "bg-landing/75" : "bg-landing"
        )}
      >
        {/* Left */}
        <div className="flex gap-3 md:gap-4 items-center transition-all ">
          {/* Branding */}
          <Link
            prefetch={false}
            className="flex gap-2.5 items-center hover:opacity-85 transition-all "
            href="/"
            draggable={false}
          >
            <Image
              width={24}
              height={24}
              className="size-6"
              src="https://cdn.fascinated.cc/assets/logos/scoresaber.png"
              alt="ScoreSaber Logo"
            />
            <h1 className="hidden md:flex text-lg font-bold text-ssr">SSR</h1>
          </Link>

          {/* Links */}
          <div className="flex gap-3 md:gap-5 items-center transition-all ">
            {links.map(link => link)}
          </div>
        </div>

        {/* Right */}
        <div className="md:pl-6 flex gap-2 items-center divide-x divide-muted transition-all ">
          <div className="flex gap-2.5 items-center transition-all pr-2">
            <PlayerAndLeaderboardSearch />
            <Settings />
          </div>
          <div>
            <ProfileButton />
          </div>
        </div>
      </nav>
    </div>
  );
}

function SimpleNavLink({ content, href }: { content: ReactElement<any>; href: string }) {
  return (
    <Link
      prefetch={false}
      className="flex gap-3 items-center text-sm hover:opacity-80 transition-all "
      href={href}
      target={href.startsWith("/") ? "_self" : "_blank"}
      draggable={false}
    >
      {content}
    </Link>
  );
}
