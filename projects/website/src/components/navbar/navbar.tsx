"use client";

import { cn } from "@/common/utils";
import FriendsButton from "@/components/friend/friends-button";
import PlayerAndLeaderboardSearch from "@/components/navbar/player-and-leaderboard-search";
import ProfileButton from "@/components/navbar/profile-button";
import { CogIcon, CubeIcon } from "@heroicons/react/24/solid";
import { ChartBarIcon, MusicIcon, TrendingUpIcon } from "lucide-react";
import Link from "next/link";
import { ReactElement, useEffect, useState } from "react";

const links: ReactElement[] = [
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
    <nav
      className={cn(
        "sticky inset-x-0 top-0 w-full px-2 xs:px-5 py-1 flex justify-between lg:justify-around h-[3rem] items-center backdrop-blur-md border-b border-muted select-none z-50",
        hasScrolled ? "bg-landing/75" : "bg-landing"
      )}
    >
      {/* Left */}
      <div className="flex gap-3 md:gap-4 items-center transition-all transform-gpu">
        {/* Branding */}
        <Link
          prefetch={false}
          className="flex gap-2.5 items-center hover:opacity-85 transition-all transform-gpu"
          href="/"
          draggable={false}
        >
          <img width={24} height={24} className="size-6" src="/assets/logos/scoresaber.png" alt="ScoreSaber Logo" />
          <h1 className="hidden md:flex text-lg font-bold text-ssr">SSR</h1>
        </Link>

        {/* Links */}
        <div className="flex gap-3 md:gap-5 items-center transition-all transform-gpu">{links.map(link => link)}</div>
      </div>

      {/* Right */}
      <div className="md:pl-6 flex gap-2.5 items-center divide-x divide-muted transition-all transform-gpu">
        <div className="flex gap-2.5 items-center transition-all transform-gpu">
          <PlayerAndLeaderboardSearch />
          <SimpleNavLink
            content={<CogIcon className="size-6 text-zinc-200 hover:animate-spin-slow" />}
            href="/settings"
          />
        </div>
        <div className="pl-2">
          <ProfileButton />
        </div>
      </div>
    </nav>
  );
}

function SimpleNavLink({ content, href }: { content: ReactElement; href: string }) {
  return (
    <Link
      prefetch={false}
      className="flex gap-3 items-center text-sm hover:opacity-80 transition-all transform-gpu"
      href={href}
      target={href.startsWith("/") ? "_self" : "_blank"}
      draggable={false}
    >
      {content}
    </Link>
  );
}
