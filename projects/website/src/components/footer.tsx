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
        "px-10 min-h-80 py-5 flex flex-col gap-10 lg:gap-0 justify-between border-t border-muted/50 select-none",
        isHome ? "bg-secondary" : "mt-5 bg-secondary/60"
      )}
    >
      {/* Top Section */}

      <div className="flex justify-center">
        {/* Branding & Social Links */}
        <div className="w-full max-w-(--breakpoint-2xl) flex flex-col gap-7 lg:flex-row justify-between items-center lg:items-start">
          <div className="flex flex-col gap-5">
            {/* Branding */}
            <div className="flex flex-col gap-2 text-center items-center lg:text-left lg:items-start">
              <Link
                className="flex gap-3 items-center hover:opacity-75 transition-all "
                href="/"
                draggable={false}
              >
                <Image
                  src="https://cdn.fascinated.cc/assets/logos/scoresaber.png"
                  alt="Scoresaber Logo"
                  width={36}
                  height={36}
                />
                <h1 className="text-xl font-bold text-pp">ScoreSaber Reloaded</h1>
              </Link>
              <p className="max-w-md text-sm opacity-85">
                ScoreSaber Reloaded is a new way to view your scores and get more stats about you
                and your plays
              </p>
            </div>

            {/* Social Links */}
            <div className="flex gap-4 justify-center lg:justify-start items-center">
              {socialLinks.map(link => (
                <Link
                  key={link.name}
                  className="hover:opacity-75 transition-all "
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
          <div className="flex gap-20 md:gap-32 transition-all ">
            {Object.entries(links).map(([title, links]) => (
              <div key={title} className="flex flex-col gap-0.5">
                <h1 className="pb-0.5 text-lg font-semibold text-ssr">{title}</h1>
                {links.map(link => {
                  const external: boolean = !link.href.startsWith("/");
                  return (
                    <Link
                      key={link.name}
                      className="flex gap-2 items-center text-sm hover:opacity-75 transition-all "
                      href={link.href}
                      target={external ? "_blank" : undefined}
                      draggable={false}
                    >
                      <span className={cn("hidden sm:flex", !link.shortName && "flex")}>
                        {link.name}
                      </span>
                      {link.shortName && <span className="flex sm:hidden">{link.shortName}</span>}
                      {external && <ExternalLink className="w-3.5 h-3.5" />}
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
