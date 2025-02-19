"use client";

import Avatar from "@/components/avatar";
import ScoreSaberPlayer from "@ssr/common/player/impl/scoresaber-player";
import { truncateText } from "@ssr/common/string-utils";
import Link from "next/link";
import NavbarButton from "./navbar-button";

type ProfileButtonProps = {
  player: ScoreSaberPlayer;
};

export default function ProfileButton({ player }: ProfileButtonProps) {
  return (
    <NavbarButton className="px-0">
      <Avatar src={player.avatar} className="w-6 h-6" alt={`${player.name}'s Profile Picture`} />
      <p className="pl-0.5 hidden lg:block text-ssr">{truncateText(player.name, 20)}</p>
    </NavbarButton>
  );
}
