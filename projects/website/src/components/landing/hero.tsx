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
    <div className="flex flex-col gap-2 text-center items-center select-none">
      <div className="flex flex-col gap-2.5 text-center items-center">
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
      className="group mb-1.5 bg-neutral-900 hover:opacity-85 border border-white/5 rounded-full transition-all "
      href="https://github.com/RealFascinated/scoresaber-reloaded"
      target="_blank"
      draggable={false}
    >
      <AnimatedShinyText className="px-3.5 py-1 flex gap-2 text-sm items-center justify-center">
        <GithubIcon className="size-5" />
        <span>Check out our Source Code</span>
        <ArrowRight className="size-4 group-hover:translate-x-0.5 transition-all " />
      </AnimatedShinyText>
    </Link>
  );
}

function Title() {
  return (
    <div className="px-5 flex flex-col gap-1.5 items-center">
      <h1 className="text-4xl xs:text-5xl font-bold text-transparent bg-clip-text bg-linear-to-r from-ssr to-pp/85">
        ScoreSaber Reloaded
      </h1>
      <p className="max-w-sm md:max-w-lg text-sm xs:text-base opacity-85">
        ScoreSaber Reloaded is a new way to view your scores and get more stats about you and your
        plays
      </p>
    </div>
  );
}

function Buttons() {
  const { openSearch } = useSearch();
  return (
    <div className="mt-4 flex flex-col xs:flex-row gap-2 xs:gap-4 items-center">
      <Button
        className="max-w-52 flex gap-2.5 bg-ssr hover:bg-ssr/85 text-white"
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
    <div className="mx-5 my-20 relative max-w-[1190px] shadow-[0_3rem_20rem_-15px_rgba(15,15,15,0.6)] shadow-pp/50 rounded-2xl overflow-hidden">
      <BorderBeam colorFrom="#6773ff" colorTo="#4858ff" />
      <Image
        className="w-full h-full border-4 border-pp/20 rounded-2xl"
        src="https://cdn.fascinated.cc/assets/home/app-preview.png"
        alt="App Preview"
        draggable={false}
        width={1190}
        height={670}
      />
    </div>
  );
}
