"use client";

import Avatar from "@/components/avatar";
import Friend from "@/components/friend/friend";
import GithubLogo from "@/components/logos/logos/github-logo";
import TwitterLogo from "@/components/logos/logos/twitter-logo";
import PlayerAndLeaderboardSearch from "@/components/navbar/player-and-leaderboard-search";
import { useSearch } from "@/components/providers/search-provider";
import SimpleLink from "@/components/simple-link";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import useDatabase from "@/hooks/use-database";
import { useStableLiveQuery } from "@/hooks/use-stable-live-query";
import { SharedIcons } from "@/shared-icons";
import { env } from "@ssr/common/env";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { ReactElement, useRef, useState } from "react";

type FooterLink = {
  name: string;
  href: string;
  shortName?: string;
};

type SocialLinkType = {
  name: string;
  logo: ReactElement<any>;
  href: string;
};

const resourceLinks: FooterLink[] = [
  {
    name: "Source Code",
    shortName: "Source",
    href: "https://github.com/RealFascinated/scoresaber-reloaded",
  },
  {
    name: "API Documentation",
    shortName: "API",
    href: `${env.NEXT_PUBLIC_API_URL}/swagger`,
  },
  {
    name: "System Status",
    shortName: "Status",
    href: "https://status.fascinated.cc/status/scoresaber-reloaded",
  },
];

const appLinks: FooterLink[] = [
  {
    name: "Statistics",
    href: "https://grafana.fascinated.cc/d/5783f85b-a2b3-49d8-854d-b67bb524053d/ssr-public?orgId=2",
  },
];

const socialLinks: SocialLinkType[] = [
  {
    name: "Twitter",
    logo: <TwitterLogo className="size-5" />,
    href: "https://x.com/ssr_reloaded",
  },
  {
    name: "Discord",
    logo: (
      <Image
        className="size-5"
        src="/assets/logos/discord.svg"
        alt="Discord Logo"
        width={20}
        height={20}
      />
    ),
    href: "https://discord.gg/kmNfWGA4A8",
  },
  {
    name: "GitHub",
    logo: <GithubLogo className="size-5" />,
    href: "https://github.com/RealFascinated/scoresaber-reloaded",
  },
];

const navItems = [
  { id: "ranking", name: "Ranking", icon: SharedIcons.RankingNavIcon, href: "/ranking" },
  { id: "medals", name: "Medals", icon: SharedIcons.MedalsNavIcon, href: "/medals" },
  { id: "maps", name: "Leaderboards", icon: SharedIcons.MapsLeaderboardsTabIcon, href: "/maps/leaderboards" },
  { id: "ranking-queue", name: "Ranking Queue", icon: SharedIcons.MapsRankingQueueTabIcon, href: "/maps/ranking-queue" },
  { id: "overlay", name: "Overlay", icon: SharedIcons.OverlayNavIcon, href: "/overlay/builder" },
  { id: "top-scores", name: "Top Scores", icon: SharedIcons.TopScoresNavIcon, href: "/scores/top" },
  { id: "score-feed", name: "Live Scores", icon: SharedIcons.GlobalScoresModeIcon, href: "/scores/live" },
  { id: "settings", name: "Settings", icon: SharedIcons.SettingsNavIcon, href: "/settings" },
];

function FriendsPopover() {
  const database = useDatabase();
  const friends = useStableLiveQuery(() => database.getFriends());
  const { openSearch } = useSearch();

  const [open, setOpen] = useState(false);
  const closeTimeout = useRef<NodeJS.Timeout | null>(null);

  const handleMouseEnter = () => {
    if (closeTimeout.current) {
      clearTimeout(closeTimeout.current);
    }
    setOpen(true);
  };

  const handleMouseLeave = () => {
    closeTimeout.current = setTimeout(() => setOpen(false), 200);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <SidebarMenuButton onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
          <SharedIcons.FriendsNavIcon className="size-5" />
          <span>Friends</span>
        </SidebarMenuButton>
      </PopoverTrigger>
      <PopoverContent
        className="ml-3 max-h-[400px] w-screen overflow-hidden overflow-y-auto p-2 text-sm select-none md:w-[350px]"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {friends && friends.length > 0 ? (
          <div className="flex flex-col gap-0.5">
            {friends
              .sort((a, b) => {
                if (a.inactive && !b.inactive) return 1;
                if (!a.inactive && b.inactive) return -1;
                return a.rank - b.rank;
              })
              .map(friend => (
                <Friend player={friend} key={friend.id} onClick={() => setOpen(false)} />
              ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center gap-2 text-sm">
            <p className="pointer-events-none">You don&#39;t have any friends :(</p>
            <Button
              size="sm"
              onClick={() => {
                setOpen(false);
                openSearch();
              }}
            >
              Search Player
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

function ProfileSection() {
  const database = useDatabase();
  const { openSearch } = useSearch();
  const pathname = usePathname();
  const mainPlayerId = useStableLiveQuery(() => database.getMainPlayerId());
  const mainPlayer = useStableLiveQuery(() => database.getMainPlayer());

  if (mainPlayerId == null || mainPlayerId === "") {
    return (
      <SidebarMenuItem>
        <SidebarMenuButton onClick={openSearch}>
          <SharedIcons.VerifiedPlayerIcon className="size-5 shrink-0 text-green-500" />
          <span>Claim profile</span>
        </SidebarMenuButton>
      </SidebarMenuItem>
    );
  }

  const href = `/player/${mainPlayerId}`;
  const isActive = pathname != null && (pathname === href || (href !== "/" && pathname.startsWith(href)));

  return (
    <SidebarMenuItem>
      <SidebarMenuButton asChild isActive={isActive}>
        <SimpleLink href={href}>
          <Avatar
            size={20}
            src={mainPlayer?.avatar ?? ""}
            className="border-border box-border size-5 shrink-0 rounded-full border"
            alt="Your Profile Picture"
          />
          <span>My Profile</span>
        </SimpleLink>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}

export function AppSidebar() {
  return (
    <Sidebar collapsible="offcanvas">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <SimpleLink href="/home" draggable={false}>
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg">
                  <Image
                    width={32}
                    height={32}
                    className="size-8"
                    src="/assets/logos/scoresaber.png"
                    alt="ScoreSaber Logo"
                  />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">SSR</span>
                  <span className="truncate text-xs text-muted-foreground">ScoreSaber Reloaded</span>
                </div>
              </SimpleLink>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        {/* Search */}
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <PlayerAndLeaderboardSearch />
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Profile & Friends */}
        <SidebarGroup>
          <SidebarGroupLabel>Profile</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <ProfileSection />
              <SidebarMenuItem>
                <FriendsPopover />
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Navigation */}
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map(item => (
                <SidebarMenuItem key={item.id}>
                  <SidebarNavLink href={item.href} icon={item.icon}>
                    {item.name}
                  </SidebarNavLink>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <div className="px-2 pb-2">
        <div className="mb-1 px-2 text-xs font-medium text-sidebar-foreground/70">Links</div>
        <SidebarMenu>
          {resourceLinks.map(link => (
            <SidebarMenuItem key={link.name}>
              <SidebarExternalLink href={link.href}>{link.name}</SidebarExternalLink>
            </SidebarMenuItem>
          ))}
          {appLinks.map(link => (
            <SidebarMenuItem key={link.name}>
              <SidebarExternalLink href={link.href}>{link.name}</SidebarExternalLink>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </div>

      <SidebarFooter className="border-t border-sidebar-border p-3">
        <div className="flex items-center justify-center gap-3">
          {socialLinks.map(link => (
            <SimpleLink
              key={link.name}
              className="text-muted-foreground hover:text-foreground transition-colors"
              href={link.href}
              target="_blank"
              draggable={false}
            >
              {link.logo}
            </SimpleLink>
          ))}
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}

function SidebarNavLink({
  href,
  icon: Icon,
  children,
}: {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isActive = pathname != null && (pathname === href || (href !== "/" && pathname.startsWith(href)));

  return (
    <SidebarMenuButton asChild isActive={isActive}>
      <SimpleLink href={href} draggable={false}>
        <Icon className="size-5" />
        <span>{children}</span>
      </SimpleLink>
    </SidebarMenuButton>
  );
}

function SidebarExternalLink({ href, children }: { href: string; children: React.ReactNode }) {
  const external = !href.startsWith("/");
  return (
    <SidebarMenuButton asChild>
      <SimpleLink href={href} target={external ? "_blank" : undefined} draggable={false}>
        <span>{children}</span>
        {external && <SharedIcons.ExternalNavigationIcon className="ml-auto h-3.5 w-3.5 shrink-0" />}
      </SimpleLink>
    </SidebarMenuButton>
  );
}
