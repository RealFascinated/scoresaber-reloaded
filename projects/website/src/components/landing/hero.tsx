"use client";

import AnimatedShinyText from "@/components/ui/animated-shiny-text";
import { ArrowRight, GithubIcon, UserSearch } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { BorderBeam } from "@/components/ui/border-beam";
import { Separator } from "@/components/ui/separator";
import { motion } from "framer-motion";
import { useSearch } from "@/components/providers/search-provider";
import { DiscordButton } from "@/components/social/discord-button";

export default function HeroSection() {
  return (
    <div className="flex flex-col gap-2 text-center items-center select-none">
      <motion.div
        className="flex flex-col gap-2.5 text-center items-center"
        initial={{ opacity: 0, y: -40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
      >
        <Alert />
        <Title />
      </motion.div>
      <Buttons />
      <AppPreview />
      <Separator className="my-12 w-full" />
    </div>
  );
}

function Alert() {
  return (
    <Link
      prefetch={false}
      className="group mb-1.5 bg-neutral-900 hover:opacity-85 border border-white/5 rounded-full transition-all transform-gpu"
      href="https://github.com/RealFascinated/scoresaber-reloaded"
      target="_blank"
      draggable={false}
    >
      <AnimatedShinyText className="px-3.5 py-1 flex gap-2 text-sm items-center justify-center">
        <GithubIcon className="size-5" />
        <span>Check out our Source Code</span>
        <ArrowRight className="size-4 group-hover:translate-x-0.5 transition-all transform-gpu" />
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
    <motion.div
      className="mt-4 flex flex-col xs:flex-row gap-2 xs:gap-4 items-center"
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.35, duration: 0.7, ease: "easeOut" }}
    >
      <Button
        className="max-w-52 flex gap-2.5 bg-ssr hover:bg-ssr/85 text-white"
        onClick={openSearch}
      >
        <UserSearch className="size-6" />
        <span>Player Search</span>
      </Button>

      <DiscordButton />
    </motion.div>
  );
}

function AppPreview() {
  return (
    <motion.div
      className="mx-5 my-20 relative max-w-[1190px] shadow-[0_3rem_20rem_-15px_rgba(15,15,15,0.6)] shadow-pp/50 rounded-2xl overflow-hidden"
      initial={{ opacity: 0, y: -35 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.45, duration: 0.7, ease: "easeOut" }}
    >
      <BorderBeam colorFrom="#6773ff" colorTo="#4858ff" />
      <img
        className="w-full h-full border-4 border-pp/20 rounded-2xl"
        src="/assets/home/app-preview.png"
        alt="App Preview"
        draggable={false}
      />
    </motion.div>
  );
}
