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
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import useDatabase from "@/hooks/use-database";
import { useIsMobile } from "@/hooks/use-mobile";
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
      <Image className="size-5" src="/assets/logos/discord.svg" alt="Discord Logo" width={20} height={20} />
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
  {
    id: "ranking-queue",
    name: "Ranking Queue",
    icon: SharedIcons.MapsRankingQueueTabIcon,
    href: "/maps/ranking-queue",
  },
  { id: "overlay", name: "Overlay", icon: SharedIcons.OverlayNavIcon, href: "/overlay/builder" },
  { id: "top-scores", name: "Top Scores", icon: SharedIcons.TopScoresNavIcon, href: "/scores/top" },
  { id: "score-feed", name: "Live Scores", icon: SharedIcons.GlobalScoresModeIcon, href: "/scores/live" },
  { id: "settings", name: "Settings", icon: SharedIcons.SettingsNavIcon, href: "/settings" },
];

function FriendsPopover() {
  const database = useDatabase();
  const friends = useStableLiveQuery(() => database.getFriends());
  const { openSearch } = useSearch();
  const isMobile = useIsMobile();

  const [open, setOpen] = useState(false);
  const closeTimeout = useRef<NodeJS.Timeout | null>(null);

  const handleMouseEnter = () => {
    if (isMobile) {
      return;
    }
    if (closeTimeout.current) {
      clearTimeout(closeTimeout.current);
    }
    setOpen(true);
  };

  const handleMouseLeave = () => {
    if (isMobile) {
      return;
    }
    closeTimeout.current = setTimeout(() => setOpen(false), 200);
  };

  const friendCount = friends?.length ?? 0;
  const isLoading = friends === undefined;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <SidebarMenuButton
          onClick={() => isMobile && setOpen(prev => !prev)}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          <SharedIcons.FriendsNavIcon className="size-5" />
          <span>Friends</span>
          {friendCount > 0 && (
            <span className="bg-muted text-muted-foreground ml-auto rounded-md px-1.5 py-0.5 text-xs font-medium tabular-nums">
              {friendCount}
            </span>
          )}
        </SidebarMenuButton>
      </PopoverTrigger>
      <PopoverContent
        side={isMobile ? "bottom" : "right"}
        sideOffset={isMobile ? 4 : 8}
        className="flex max-h-[420px] w-screen flex-col overflow-hidden p-0 text-sm select-none md:w-[340px]"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {/* Header */}
        <div className="border-border/50 flex items-center justify-between border-b px-3 py-2.5">
          <div className="flex items-center gap-2">
            <SharedIcons.FriendsNavIcon className="text-muted-foreground size-4" />
            <span className="font-semibold">Friends</span>
          </div>
          {friendCount > 0 && (
            <span className="bg-muted text-muted-foreground rounded-md px-2 py-0.5 text-xs font-medium tabular-nums">
              {friendCount}
            </span>
          )}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-2">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <SharedIcons.PageLoadingIcon className="text-muted-foreground size-5 animate-spin" />
            </div>
          ) : friendCount > 0 ? (
            <div className="flex flex-col gap-px">
              {friends
                .sort((a, b) => {
                  if (a.inactive && !b.inactive) {
                    return 1;
                  }
                  if (!a.inactive && b.inactive) {
                    return -1;
                  }
                  return a.rank - b.rank;
                })
                .map(friend => (
                  <Friend player={friend} key={friend.id} onClick={() => setOpen(false)} />
                ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center gap-3 py-8">
              <SharedIcons.FriendsNavIcon className="text-muted-foreground/30 size-10" />
              <div className="flex flex-col items-center gap-1">
                <p className="text-muted-foreground font-medium">No friends yet</p>
                <p className="text-muted-foreground/60 max-w-[220px] text-center text-xs">
                  Search for players to add them to your friends list
                </p>
              </div>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => {
                  setOpen(false);
                  openSearch();
                }}
                className="gap-1.5"
              >
                <SharedIcons.SearchPlayersIcon className="size-4" />
                Find Players
              </Button>
            </div>
          )}
        </div>
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
                  <span className="text-muted-foreground truncate text-xs">ScoreSaber Reloaded</span>
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
          <SidebarGroupContent>
            <SidebarMenu>
              <ProfileSection />
              <SidebarMenuItem>
                <FriendsPopover />
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <hr className="border-sidebar-border mx-3" />

        {/* Navigation */}
        <SidebarGroup>
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

      <SidebarFooter className="border-sidebar-border border-t p-3">
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
