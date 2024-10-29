"use client";

import AnimatedShinyText from "@/components/ui/animated-shiny-text";
import { ArrowRight, UserSearch } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { SiGithub } from "react-icons/si";
import { BorderBeam } from "@/components/ui/border-beam";
import { Separator } from "@/components/ui/separator";
import { motion } from "framer-motion";

export default function HeroSection() {
  return (
    <div className="flex flex-col gap-3.5 text-center items-center select-none">
      <motion.div
        className="flex flex-col gap-3.5 text-center items-center"
        initial={{ opacity: 0, y: -40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
      >
        <Alert />
        <Title />
      </motion.div>
      <Buttons />
      <AppPreview />
      <Separator className="my-12 w-screen" />
    </div>
  );
}

function Alert() {
  return (
    <Link
      className="group mb-1.5 bg-neutral-900 hover:opacity-85 border border-white/5 rounded-full transition-all transform-gpu"
      href="https://git.fascinated.cc/Fascinated/scoresaber-reloadedv3"
      target="_blank"
      draggable={false}
    >
      <AnimatedShinyText className="px-3.5 py-1 flex gap-2 items-center justify-center">
        <SiGithub className="size-5" />
        <span>Check out our Source Code</span>
        <ArrowRight className="size-4 group-hover:translate-x-0.5 transition-all transform-gpu" />
      </AnimatedShinyText>
    </Link>
  );
}

function Title() {
  return (
    <>
      <h1 className="text-4xl sm:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-ssr to-pp/85">
        ScoreSaber Reloaded
      </h1>
      <p className="max-w-sm md:max-w-xl md:text-lg opacity-85">
        Scoresaber Reloaded is a new way to view your scores and get more stats about your and your plays
      </p>
    </>
  );
}

function Buttons() {
  return (
    <motion.div
      className="mt-4 flex flex-col xs:flex-row gap-4 items-center"
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.35, duration: 0.7, ease: "easeOut" }}
    >
      <Link href="https://discord.gg/kmNfWGA4A8" target="_blank">
        <Button className="max-w-52 flex gap-2.5 bg-pp hover:bg-pp/85 text-white text-base">
          <UserSearch className="size-6" />
          <span>Player Search</span>
        </Button>
      </Link>

      <Link href="https://discord.gg/kmNfWGA4A8" target="_blank">
        <Button className="max-w-52 flex gap-2.5 bg-[#5865F2] hover:bg-[#5865F2]/85 text-white text-base">
          <img className="size-6" src="/assets/logos/discord.svg" />
          <span>Join our Discord</span>
        </Button>
      </Link>
    </motion.div>
  );
}

function AppPreview() {
  return (
    <motion.div
      className="mx-5 my-20 relative max-w-[1280px] shadow-[0_3rem_20rem_-15px_rgba(15,15,15,0.6)] shadow-pp/50 rounded-2xl overflow-hidden"
      initial={{ opacity: 0, y: -35 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.45, duration: 0.7, ease: "easeOut" }}
    >
      <BorderBeam colorFrom="#6773ff" colorTo="#4858ff" />
      <img
        className="w-full h-full border-4 border-pp/20 rounded-2xl"
        src="/assets/home/app-preview.png"
        draggable={false}
      />
    </motion.div>
  );
}
