"use client";

import Link from "next/link";
import React, { ReactElement, useEffect, useState } from "react";
import { cn } from "@/common/utils";
import FriendsButton from "@/components/navbar/friends-button";
import { TrendingUpIcon } from "lucide-react";
import ProfileButton from "@/components/navbar/profile-button";
import { CogIcon } from "@heroicons/react/24/solid";
import PlayerSearch from "@/components/navbar/player-search";
import Tooltip from "@/components/tooltip";

const links: ReactElement[] = [
  <FriendsButton key="friends" />,
  <SimpleNavLink
    key="ranking"
    content={
      <>
        <TrendingUpIcon className="size-5" />
        <span className="hidden sm:flex">Ranking</span>
      </>
    }
    href="/ranking"
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
        "sticky inset-x-0 top-0 w-screen px-1 xs:px-5 py-1 flex justify-between lg:justify-around items-center backdrop-blur-md border-b border-muted transition-all transform-gpu select-none z-50",
        hasScrolled ? "h-11 bg-landing/75" : "h-[3.25rem] bg-landing"
      )}
    >
      {/* Left */}
      <div className="flex gap-2 items-center transition-all transform-gpu">
        {/* Branding */}
        <Link
          className="flex gap-2 items-center hover:opacity-85 transition-all transform-gpu"
          href="/"
          draggable={false}
        >
          <img className="size-6" src="/assets/logos/scoresaber.png" alt="ScoreSaber Logo" />
          <h1 className="hidden md:flex text-lg font-bold text-ssr">SSR</h1>
        </Link>

        {/* Links */}
        <div className="xs:pl-2 flex gap-3 md:gap-5 items-center transition-all transform-gpu">
          {links.map(link => link)}
        </div>
      </div>

      {/* Right */}
      <div className="md:pl-6 flex gap-2 md:gap-4 items-center divide-x md:divide-x-2 divide-muted transition-all transform-gpu">
        <div className="flex gap-2 md:gap-4 items-center transition-all transform-gpu">
          <PlayerSearch />
          <SimpleNavLink
            content={<CogIcon className="size-6 text-zinc-200 hover:animate-spin-slow" />}
            href="/settings"
          />
        </div>
        <ProfileButton />
      </div>
    </nav>
  );
}

function SimpleNavLink({ content, href }: { content: ReactElement; href: string }) {
  return (
    <Link
      className="flex gap-3 items-center text-sm hover:opacity-80 transition-all transform-gpu"
      href={href}
      target={href.startsWith("/") ? "_self" : "_blank"}
      draggable={false}
    >
      {content}
    </Link>
  );
}
