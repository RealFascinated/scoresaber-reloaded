"use client";

import { cn } from "@/common/utils";
import GithubLogo from "@/components/logos/logos/github-logo";
import TwitterLogo from "@/components/logos/logos/twitter-logo";
import { ExternalLink } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ReactElement } from "react";

type FooterLink = {
  /**
   * The name of this link.
   */
  name: string;

  /**
   * The href for this link.
   */
  href: string;

  /**
   * The optional name to show
   * when the screen size is small.
   */
  shortName?: string;
};

type SocialLinkType = {
  /**
   * The name of this social link.
   */
  name: string;

  /**
   * The logo for this social link.
   */
  logo: ReactElement<any>;

  /**
   * The href for this social link.
   */
  href: string;
};

const links: {
  [category: string]: FooterLink[];
} = {
  Resources: [
    {
      name: "Source Code",
      shortName: "Source",
      href: "https://github.com/RealFascinated/scoresaber-reloaded",
    },
    {
      name: "System Status",
      shortName: "Status",
      href: "https://status.fascinated.cc/status/scoresaber-reloaded",
    },
  ],
  App: [
    {
      name: "Score Feed",
      href: "/scores/live",
    },
  ],
};

const socialLinks: SocialLinkType[] = [
  {
    name: "Twitter",
    logo: <TwitterLogo className="size-5 lg:size-6" />,
    href: "https://x.com/ssr_reloaded",
  },
  {
    name: "Discord",
    logo: (
      <Image
        className="size-6 lg:size-7"
        src="https://cdn.fascinated.cc/assets/logos/discord.svg"
        alt="Discord Logo"
        width={24}
        height={24}
      />
    ),
    href: "https://discord.gg/kmNfWGA4A8",
  },
  {
    name: "GitHub",
    logo: <GithubLogo className="size-5 lg:size-6" />,
    href: "https://github.com/RealFascinated/scoresaber-reloaded",
  },
];

export default function Footer({
  buildId,
  buildTimeShort,
}: {
  buildId: string;
  buildTimeShort: string | undefined;
}) {
  const isHome: boolean = usePathname() === "/";
  return (
    <footer
      className={cn(
        "border-muted/50 flex min-h-80 flex-col justify-between gap-10 border-t px-10 py-5 select-none lg:gap-0",
        isHome ? "bg-secondary" : "bg-secondary/60 mt-5"
      )}
    >
      {/* Top Section */}

      <div className="flex justify-center">
        {/* Branding & Social Links */}
        <div className="flex w-full max-w-(--breakpoint-2xl) flex-col items-center justify-between gap-7 lg:flex-row lg:items-start">
          <div className="flex flex-col gap-5">
            {/* Branding */}
            <div className="flex flex-col items-center gap-2 text-center lg:items-start lg:text-left">
              <Link
                className="flex items-center gap-3 transition-all hover:opacity-75"
                href="/"
                draggable={false}
              >
                <Image
                  src="https://cdn.fascinated.cc/assets/logos/scoresaber.png"
                  alt="Scoresaber Logo"
                  width={36}
                  height={36}
                />
                <h1 className="text-primary text-xl font-bold">ScoreSaber Reloaded</h1>
              </Link>
              <p className="max-w-md text-sm opacity-85">
                ScoreSaber Reloaded is a new way to view your scores and get more stats about you
                and your plays
              </p>
            </div>

            {/* Social Links */}
            <div className="flex items-center justify-center gap-4 lg:justify-start">
              {socialLinks.map(link => (
                <Link
                  key={link.name}
                  className="transition-all hover:opacity-75"
                  href={link.href}
                  target="_blank"
                  draggable={false}
                >
                  {link.logo}
                </Link>
              ))}
            </div>
          </div>

          {/* Links */}
          <div className="flex gap-20 transition-all md:gap-32">
            {Object.entries(links).map(([title, links]) => (
              <div key={title} className="flex flex-col gap-0.5">
                <h1 className="text-primary pb-0.5 text-lg font-semibold">{title}</h1>
                {links.map(link => {
                  const external: boolean = !link.href.startsWith("/");
                  return (
                    <Link
                      key={link.name}
                      className="flex items-center gap-2 text-sm transition-all hover:opacity-75"
                      href={link.href}
                      target={external ? "_blank" : undefined}
                      draggable={false}
                    >
                      <span className={cn("hidden sm:flex", !link.shortName && "flex")}>
                        {link.name}
                      </span>
                      {link.shortName && <span className="flex sm:hidden">{link.shortName}</span>}
                      {external && <ExternalLink className="h-3.5 w-3.5" />}
                    </Link>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Section */}
      <div className="flex justify-center">
        {/* Build Info */}
        <p className="text-sm opacity-50">
          Build {buildId} ({buildTimeShort})
        </p>
      </div>
    </footer>
  );
}
