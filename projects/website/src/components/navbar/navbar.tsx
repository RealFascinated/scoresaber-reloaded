"use client";

import { cn } from "@/common/utils";
import FriendsButton from "@/components/friend/friends-button";
import PlayerAndLeaderboardSearch from "@/components/navbar/player-and-leaderboard-search";
import ProfileButton from "@/components/navbar/profile-button";
import { CubeIcon } from "@heroicons/react/24/solid";
import { ChartBarIcon, MusicIcon, TrendingUpIcon, TrophyIcon } from "lucide-react";
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
    href="/statistics"
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
  <SimpleNavLink
    key="top-scores"
    content={
      <>
        <TrophyIcon className="size-5" />
        <span className="hidden xl:flex">Top Scores</span>
      </>
    }
    href="/scores/top/all"
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
        href="https://discord.gg/kmNfWGA4A8"
        target="_blank"
        className="bg-discord-blue flex items-center justify-center gap-2 px-4 py-1 text-white transition-all hover:opacity-80"
      >
        <FaDiscord />
        <span>Join our Discord server</span>
      </Link>

      {/* Navbar */}
      <nav
        className={cn(
          "xs:px-5 border-muted/50 sticky inset-x-0 top-0 z-50 flex h-12 w-full items-center justify-between border-b px-2 py-1 backdrop-blur-md select-none lg:justify-around",
          hasScrolled ? "bg-landing/75" : "bg-landing"
        )}
      >
        {/* Left */}
        <div className="flex items-center gap-3 transition-all md:gap-4">
          {/* Branding */}
          <Link
            className="flex items-center gap-2.5 transition-all hover:opacity-85"
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
            <h1 className="text-ssr hidden text-lg font-bold md:flex">SSR</h1>
          </Link>

          {/* Links */}
          <div className="flex items-center gap-3 transition-all md:gap-5">
            {links.map(link => link)}
          </div>
        </div>

        {/* Right */}
        <div className="divide-muted flex items-center gap-2 divide-x transition-all md:pl-6">
          <div className="flex items-center gap-2.5 pr-2 transition-all">
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
      className="flex items-center gap-3 text-sm transition-all hover:opacity-80"
      href={href}
      target={href.startsWith("/") ? "_self" : "_blank"}
      draggable={false}
    >
      {content}
    </Link>
  );
}
