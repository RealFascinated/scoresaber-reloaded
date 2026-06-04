"use client";

import Database from "@/common/database/database";
import Avatar from "@/components/avatar";
import { useSearch } from "@/components/providers/search-provider";
import useDatabase from "@/hooks/use-database";
import { useStableLiveQuery } from "@/hooks/use-stable-live-query";
import { SharedIcons } from "@/shared-icons";
import { usePathname } from "next/navigation";
import NavbarButton from "./navbar-button";

export default function ProfileButton() {
  const database: Database = useDatabase();
  const pathname = usePathname();
  const { openSearch } = useSearch();
  const mainPlayerId = useStableLiveQuery(() => database.getMainPlayerId());
  const mainPlayer = useStableLiveQuery(() => database.getMainPlayer());

  if (mainPlayerId == null || mainPlayerId === "") {
    return (
      <NavbarButton onClick={openSearch}>
        <SharedIcons.VerifiedPlayerIcon className="size-5 shrink-0 text-green-500" />
        <span className="hidden 2xl:flex">Claim profile</span>
      </NavbarButton>
    );
  }

  const href = `/player/${mainPlayerId}`;
  const isActive = pathname != null && (pathname === href || (href !== "/" && pathname.startsWith(href)));

  return (
    <NavbarButton href={href} isActive={isActive}>
      <Avatar
        size={20}
        src={mainPlayer?.avatar ?? ""}
        className="border-border box-border size-5 shrink-0 rounded-full border"
        alt="Your Profile Picture"
      />
      <span className="hidden 2xl:flex">Me</span>
    </NavbarButton>
  );
}
