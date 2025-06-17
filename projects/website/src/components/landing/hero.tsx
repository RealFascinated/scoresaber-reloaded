"use client";

import { useSearch } from "@/components/providers/search-provider";
import { DiscordButton } from "@/components/social/discord-button";
import AnimatedShinyText from "@/components/ui/animated-shiny-text";
import { BorderBeam } from "@/components/ui/border-beam";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ArrowRight, GithubIcon, UserSearch } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

export default function HeroSection() {
  return (
    <div className="flex flex-col items-center gap-2 text-center select-none">
      <div className="flex flex-col items-center gap-2.5 text-center">
        <Alert />
        <Title />
      </div>
      <Buttons />
      <AppPreview />
      <Separator className="my-12 w-full" />
    </div>
  );
}

function Alert() {
  return (
    <Link
      className="group mb-1.5 rounded-full border border-white/5 bg-neutral-900 transition-all hover:opacity-85"
      href="https://github.com/RealFascinated/scoresaber-reloaded"
      target="_blank"
      draggable={false}
    >
      <AnimatedShinyText className="flex items-center justify-center gap-2 px-3.5 py-1 text-sm">
        <GithubIcon className="size-5" />
        <span>Check out our Source Code</span>
        <ArrowRight className="size-4 transition-all group-hover:translate-x-0.5" />
      </AnimatedShinyText>
    </Link>
  );
}

function Title() {
  return (
    <div className="flex flex-col items-center gap-1.5 px-5">
      <h1 className="xs:text-5xl from-ssr to-pp/85 bg-linear-to-r bg-clip-text text-4xl font-bold text-transparent">
        ScoreSaber Reloaded
      </h1>
      <p className="xs:text-base max-w-sm text-sm opacity-85 md:max-w-lg">
        ScoreSaber Reloaded is a new way to view your scores and get more stats about you and your
        plays
      </p>
    </div>
  );
}

function Buttons() {
  const { openSearch } = useSearch();
  return (
    <div className="xs:flex-row xs:gap-4 mt-4 flex flex-col items-center gap-2">
      <Button
        className="bg-ssr hover:bg-ssr/85 flex max-w-52 gap-2.5 text-white"
        onClick={openSearch}
      >
        <UserSearch className="size-6" />
        <span>Player Search</span>
      </Button>

      <DiscordButton />
    </div>
  );
}

function AppPreview() {
  return (
    <div className="shadow-pp/50 relative mx-5 my-20 max-w-[1190px] overflow-hidden rounded-2xl shadow-[0_3rem_20rem_-15px_rgba(15,15,15,0.6)]">
      <BorderBeam colorFrom="#6773ff" colorTo="#4858ff" />
      <Image
        className="border-pp/20 h-full w-full rounded-2xl border-4"
        src="https://cdn.fascinated.cc/assets/home/app-preview.png"
        alt="App Preview"
        draggable={false}
        width={1190}
        height={670}
      />
    </div>
  );
}
