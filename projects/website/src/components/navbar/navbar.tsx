"use client";

import { cn } from "@/common/utils";
import FriendsButton from "@/components/friend/friends-button";
import PlayerAndLeaderboardSearch from "@/components/navbar/player-and-leaderboard-search";
import ProfileButton from "@/components/navbar/profile-button";
import useDatabase from "@/hooks/use-database";
import { CubeIcon } from "@heroicons/react/24/solid";
import { useLiveQuery } from "dexie-react-hooks";
import { MusicIcon, TrendingUpIcon, TrophyIcon } from "lucide-react";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { ReactElement } from "react";
import { FaMedal } from "react-icons/fa";
import Settings from "../settings/settings";
import SimpleLink from "../simple-link";

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
    key="medals"
    content={
      <>
        <FaMedal className="size-4.5" />
        <span className="hidden xl:flex">Medals</span>
      </>
    }
    href="/medals/1"
  />,
  <SimpleNavLink
    key="maps"
    content={
      <>
        <MusicIcon className="size-5" />
        <span className="hidden xl:flex">Maps</span>
      </>
    }
    href="/maps/leaderboards"
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
    href="/scores/top"
  />,
];

export default function Navbar() {
  const database = useDatabase();
  const hasMainPlayer = useLiveQuery(() => database.hasMainPlayer());

  return (
    <nav
      className={cn(
        "border-border bg-background sticky inset-x-0 top-0 z-50 flex h-12 w-full items-center justify-between border-b px-2 py-1 backdrop-blur-md select-none lg:justify-around lg:px-8"
      )}
    >
      {/* Left */}
      <div className="flex items-center gap-1 transition-all md:gap-3">
        {/* Branding */}
        <SimpleLink
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
        </SimpleLink>

        {/* Links */}
        <div className="ml-2 flex items-center gap-0.5 transition-all md:ml-4 md:gap-1">
          {links.map(link => link)}
        </div>
      </div>

      {/* Right */}
      <div className="flex items-center gap-0.5 transition-all">
        {/* Settings and Search */}
        <div className="flex items-center gap-2 md:gap-3">
          <Settings />
          <div className="w-11 md:w-64">
            <PlayerAndLeaderboardSearch />
          </div>
        </div>

        {/* Profile Section */}
        {hasMainPlayer && <ProfileButton />}
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
    <SimpleLink
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
    </SimpleLink>
  );
}
