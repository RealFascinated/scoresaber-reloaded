"use client";

import Database from "@/common/database/database";
import Avatar from "@/components/avatar";
import useDatabase from "@/hooks/use-database";
import { useStableLiveQuery } from "@/hooks/use-stable-live-query";
import { usePathname } from "next/navigation";
import NavbarButton from "./navbar-button";

export default function ProfileButton() {
  const database: Database = useDatabase();
  const pathname = usePathname();
  const mainPlayer = useStableLiveQuery(() => database.getMainPlayer());
  if (mainPlayer == undefined) {
    return;
  }

  const href = `/player/${mainPlayer.id}`;
  const isActive = pathname != null && (pathname === href || (href !== "/" && pathname.startsWith(href)));

  return (
    <NavbarButton href={href} isActive={isActive}>
      <Avatar
        size={20}
        src={mainPlayer.avatar}
        className="border-border box-border size-5 shrink-0 rounded-full border"
        alt={`${mainPlayer.name}'s Profile Picture`}
      />
      <span className="hidden 2xl:flex">Me</span>
    </NavbarButton>
  );
}
