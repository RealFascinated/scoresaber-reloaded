"use client";

import { cn } from "@/common/utils";
import FriendsButton from "@/components/friend/friends-button";
import PlayerAndLeaderboardSearch from "@/components/navbar/player-and-leaderboard-search";
import ProfileButton from "@/components/navbar/profile-button";
import { CubeIcon } from "@heroicons/react/24/solid";
import { ChartBarIcon, MusicIcon, TrendingUpIcon, TrophyIcon } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ReactElement, useEffect, useState } from "react";
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
    className="hidden md:flex"
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
    <nav
      className={cn(
        "border-border bg-background sticky inset-x-0 top-0 z-50 flex h-12 w-full items-center justify-between border-b px-2 py-1 backdrop-blur-md select-none lg:justify-around lg:px-8",
        hasScrolled && "shadow-sm"
      )}
    >
      {/* Left */}
      <div className="flex items-center gap-1 transition-all md:gap-3">
        {/* Branding */}
        <Link
          className="flex items-center gap-1 transition-all hover:opacity-80 md:gap-2"
          href="/"
          draggable={false}
        >
          <Image
            width={24}
            height={24}
            className="size-5 md:size-6"
            src="https://cdn.fascinated.cc/assets/logos/scoresaber.png"
            alt="ScoreSaber Logo"
          />
          <h1 className="text-primary hidden text-base font-bold md:flex md:text-lg">SSR</h1>
        </Link>

        {/* Links */}
        <div className="ml-2 flex items-center gap-0.5 transition-all md:ml-4 md:gap-1">
          {links.map(link => link)}
        </div>
      </div>

      {/* Right */}
      <div className="flex items-center gap-2 transition-all">
        {/* Settings and Search */}
        <div className="flex items-center gap-2 md:gap-3">
          <Settings />
          <div className="w-12 md:w-64">
            <PlayerAndLeaderboardSearch />
          </div>
        </div>

        {/* Profile Section */}
        <div className="flex items-center gap-2 md:gap-3">
          <ProfileButton />
        </div>
      </div>
    </nav>
  );
}

function SimpleNavLink({
  content,
  href,
  className,
}: {
  content: ReactElement<any>;
  href: string;
  className?: string;
}) {
  const pathname = usePathname();
  const isActive = pathname && (pathname === href || (href !== "/" && pathname.startsWith(href)));

  return (
    <Link
      className={cn(
        "flex items-center gap-2 px-2 py-1 text-sm transition-colors",
        isActive ? "text-primary" : "text-muted-foreground hover:text-primary",
        className
      )}
      href={href}
      target={href.startsWith("/") ? "_self" : "_blank"}
      draggable={false}
    >
      {content}
    </Link>
  );
}
