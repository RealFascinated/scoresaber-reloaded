"use client";

import { cn } from "@/common/utils";
import FriendsButton from "@/components/friend/friends-button";
import PlayerAndLeaderboardSearch from "@/components/navbar/player-and-leaderboard-search";
import SimpleLink from "@/components/simple-link";
import { CubeIcon } from "@radix-ui/react-icons";
import { Medal, MusicIcon, Settings, TrendingUpIcon, TrophyIcon } from "lucide-react";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { ReactElement } from "react";
import NavbarButton from "./navbar-button";
import ProfileButton from "./profile-button";

type Link = {
  name: string;
  icon: ReactElement<any>;
  href?: string;
  className?: string;
  side: "left" | "right";
};

const links: Link[] = [
  {
    name: "",
    icon: <ProfileButton />,
    side: "left",
  },
  {
    name: "Friends",
    icon: <FriendsButton key="friends" />,
    side: "left",
  },
  {
    name: "Ranking",
    icon: <TrendingUpIcon className="size-5" />,
    href: "/ranking",
    side: "left",
  },
  {
    name: "Medals",
    icon: <Medal className="size-5" />,
    href: "/medals",
    side: "left",
  },

  // Right
  {
    name: "Maps",
    icon: <MusicIcon className="size-5" />,
    href: "/maps/leaderboards",
    side: "right",
  },
  {
    name: "Overlay",
    icon: <CubeIcon className="size-5" />,
    href: "/overlay/builder",
    side: "right",
  },
  {
    name: "Top Scores",
    icon: <TrophyIcon className="size-5" />,
    href: "/scores/top",
    side: "right",
  },
  {
    name: "Settings",
    icon: <Settings className="size-5" />,
    href: "/settings",
    side: "right",
  },
  {
    name: "",
    icon: <PlayerAndLeaderboardSearch />,
    side: "right",
  },
];

export default function Navbar() {
  const leftLinks = links.filter(link => link.side === "left");
  const rightLinks = links.filter(link => link.side === "right");

  return (
    <nav
      className={cn(
        "border-border bg-background/55 sticky inset-x-0 top-0 z-50 flex h-12 w-full items-center justify-between border-b px-2 py-1 backdrop-blur-md select-none lg:justify-around"
      )}
    >
      {/* Left */}
      <div className="flex items-center gap-(--spacing-sm) md:gap-3">
        {/* Branding */}
        <SimpleLink
          className="flex items-center gap-(--spacing-sm) hover:opacity-80 md:gap-2"
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
        <div className="flex items-center gap-0.5 md:gap-1">
          {leftLinks.map(link => (
            <NavButton key={link.name} {...link} />
          ))}
        </div>
      </div>

      {/* Right */}
      <div className="flex items-center gap-(--spacing-sm)">
        <div className="flex items-center gap-0.5 md:gap-1">
          {rightLinks.map(link => (
            <NavButton key={link.name} {...link} />
          ))}
        </div>
      </div>
    </nav>
  );
}

function NavButton({ name, icon, href, className }: Link) {
  const pathname = usePathname();

  if (href == null) {
    return <div className={cn(className)}>{icon}</div>;
  }

  const isActive = pathname != null && (pathname === href || (href !== "/" && pathname.startsWith(href)));

  return (
    <NavbarButton href={href} isActive={isActive} className={className}>
      {icon}
      <span className="hidden 2xl:flex">{name}</span>
    </NavbarButton>
  );
}
