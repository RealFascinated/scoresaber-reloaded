"use client";

import { cn } from "@/common/utils";
import FriendsButton from "@/components/friend/friends-button";
import PlayerAndLeaderboardSearch from "@/components/navbar/player-and-leaderboard-search";
import ProfileButton from "@/components/navbar/profile-button";
import useDatabase from "@/hooks/use-database";
import { CubeIcon } from "@heroicons/react/24/solid";
import { useLiveQuery } from "dexie-react-hooks";
import { ChartBarIcon, MusicIcon, TrendingUpIcon, TrophyIcon } from "lucide-react";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { ReactElement } from "react";
import { FaMedal } from "react-icons/fa";
import SimpleLink from "../simple-link";

const links: ReactElement<any>[] = [
  <FriendsButton key="friends" />,
  <SimpleNavLink
    key="ranking"
    name="Ranking"
    icon={<TrendingUpIcon className="size-5" />}
    href="/ranking"
  />,
  <SimpleNavLink
    key="medals"
    name="Medals"
    icon={<FaMedal className="size-4.5" />}
    href="/medals/1"
  />,
  <SimpleNavLink
    key="maps"
    name="Maps"
    icon={<MusicIcon className="size-5" />}
    href="/maps/leaderboards"
  />,
  <SimpleNavLink
    key="overlay"
    name="Overlay"
    icon={<CubeIcon className="size-5" />}
    href="/overlay/builder"
    className="hidden md:flex"
  />,
  <SimpleNavLink
    key="top-scores"
    name="Top Scores"
    icon={<TrophyIcon className="size-5" />}
    href="/scores/top"
  />,
  <SimpleNavLink
    key="statistics"
    name="Statistics"
    icon={<ChartBarIcon className="size-5" />}
    href="/statistics"
  />,
];

export default function Navbar() {
  const database = useDatabase();
  const hasMainPlayer = useLiveQuery(() => database.hasMainPlayer());

  return (
    <nav
      className={cn(
        "border-border bg-background/55 sticky inset-x-0 top-0 z-50 flex h-12 w-full items-center justify-between border-b px-2 py-1 backdrop-blur-md select-none lg:justify-around lg:px-8"
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
        {/* Search */}
        <div className="w-11 md:w-64">
          <PlayerAndLeaderboardSearch />
        </div>

        {/* Profile Section */}
        {hasMainPlayer && <ProfileButton />}
      </div>
    </nav>
  );
}

function SimpleNavLink({
  name,
  icon,
  href,
  className,
}: {
  name: string;
  icon: ReactElement<any>;
  href: string;
  className?: string;
}) {
  const pathname = usePathname();
  const isActive = pathname && (pathname === href || (href !== "/" && pathname.startsWith(href)));

  return (
    <SimpleLink
      className={cn(
        "group relative flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm font-medium transition-colors duration-150",
        isActive
          ? "bg-primary/10 text-primary border-primary/20 border"
          : "text-muted-foreground hover:text-primary hover:bg-primary/5",
        className
      )}
      href={href}
      target={href.startsWith("/") ? "_self" : "_blank"}
      draggable={false}
    >
      {icon}
      <span className="hidden 2xl:flex">{name}</span>

      {/* Active indicator */}
      {isActive && (
        <div className="bg-primary absolute -bottom-0.5 left-1/2 h-0.5 w-4 -translate-x-1/2 rounded-full transition-all duration-200" />
      )}
    </SimpleLink>
  );
}
