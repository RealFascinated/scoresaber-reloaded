"use client";

import { LOGIN_PATH, signOut } from "@/common/auth/auth-api";
import { cn } from "@/common/utils";
import Avatar from "@/components/avatar";
import Friend from "@/components/friend/friend";
import GithubLogo from "@/components/logos/logos/github-logo";
import TwitterLogo from "@/components/logos/logos/twitter-logo";
import PlayerAndLeaderboardSearch from "@/components/navbar/player-and-leaderboard-search";
import { useSearch } from "@/components/providers/search-provider";
import RealmSelector from "@/components/realm-selector";
import SimpleLink from "@/components/simple-link";
import SimpleTooltip from "@/components/simple-tooltip";
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
import { ME_QUERY_KEY } from "@/hooks/use-me";
import { useIsMobile } from "@/hooks/use-mobile";
import { useStableLiveQuery } from "@/hooks/use-stable-live-query";
import { SharedIcons } from "@/shared-icons";
import { env } from "@ssr/common/env";
import { formatNumberWithCommas, formatPp } from "@ssr/common/utils/number-utils";
import { useQueryClient } from "@tanstack/react-query";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { ReactElement, useRef, useState } from "react";
import { toast } from "sonner";

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

const navButtonClass = cn(
  "text-sidebar-foreground/70 h-8 gap-2.5 px-2.5",
  "hover:text-sidebar-foreground",
  "data-[active=true]:text-sidebar-foreground data-[active=true]:[&_svg]:text-primary"
);

type NavItem = {
  id: string;
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  href: string;
};

const navGroups: { label: string; items: NavItem[] }[] = [
  {
    label: "Players",
    items: [
      { id: "ranking", name: "Ranking", icon: SharedIcons.RankingNavIcon, href: "/ranking" },
      { id: "medals", name: "Medals", icon: SharedIcons.MedalsNavIcon, href: "/medals" },
    ],
  },
  {
    label: "Maps",
    items: [
      {
        id: "maps",
        name: "Leaderboards",
        icon: SharedIcons.MapsLeaderboardsTabIcon,
        href: "/maps/leaderboards",
      },
      {
        id: "ranking-queue",
        name: "Ranking Queue",
        icon: SharedIcons.MapsRankingQueueTabIcon,
        href: "/maps/ranking-queue",
      },
    ],
  },
  {
    label: "Scores",
    items: [
      { id: "top-scores", name: "Top Scores", icon: SharedIcons.TopScoresNavIcon, href: "/scores/top" },
      { id: "score-feed", name: "Live Scores", icon: SharedIcons.GlobalScoresModeIcon, href: "/scores/live" },
    ],
  },
  {
    label: "Tools",
    items: [
      { id: "overlay", name: "Overlay", icon: SharedIcons.OverlayNavIcon, href: "/overlay/builder" },
      { id: "settings", name: "Settings", icon: SharedIcons.SettingsNavIcon, href: "/settings" },
    ],
  },
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
          className={navButtonClass}
          onClick={() => isMobile && setOpen(prev => !prev)}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          <SharedIcons.FriendsNavIcon className="size-[18px]" />
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
        // Hover-triggered popover: don't steal focus on open. Otherwise Radix auto-focuses
        // the first tabbable element (e.g. a country flag tooltip wrapper), which opens its
        // tooltip even though the user never hovered it.
        onOpenAutoFocus={event => event.preventDefault()}
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
  const pathname = usePathname();
  const mainPlayerId = useStableLiveQuery(() => database.getMainPlayerId());
  const mainPlayer = useStableLiveQuery(() => database.getMainPlayer());
  const queryClient = useQueryClient();

  async function handleSignOut() {
    try {
      await signOut();
      queryClient.setQueryData(ME_QUERY_KEY, null);
      await database.setMainPlayerId(undefined);
      // Reload so nothing keeps showing the previous player (see useStableLiveQuery's cache)
      window.location.reload();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to sign out");
    }
  }

  if (mainPlayerId == null || mainPlayerId === "") {
    return (
      <SimpleLink
        href={`${LOGIN_PATH}?redirect=${encodeURIComponent(pathname ?? "/")}`}
        draggable={false}
        className="text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-sm transition-colors"
      >
        <SharedIcons.SignInIcon className="text-success size-5 shrink-0" />
        <span className="font-medium">Sign in</span>
      </SimpleLink>
    );
  }

  const href = `/player/${mainPlayerId}`;
  const isActive = pathname != null && (pathname === href || (href !== "/" && pathname.startsWith(href)));

  return (
    <div className="flex items-center gap-1">
      <SimpleLink
        href={href}
        draggable={false}
        className={cn(
          "flex min-w-0 flex-1 items-center gap-2.5 rounded-md px-2.5 py-1.5 transition-colors",
          isActive ? "bg-sidebar-accent" : "hover:bg-sidebar-accent/60"
        )}
      >
        <Avatar
          size={32}
          src={mainPlayer?.avatar ?? ""}
          className="border-border box-border size-8 shrink-0 rounded-full border"
          alt="Your Profile Picture"
        />
        <div className="grid min-w-0 flex-1 leading-tight">
          <span className="truncate text-sm font-medium">{mainPlayer?.name ?? "My Profile"}</span>
          {mainPlayer != undefined && (
            <span className="text-muted-foreground text-xs tabular-nums">
              #{formatNumberWithCommas(mainPlayer.rank)} · {formatPp(mainPlayer.pp)}pp
            </span>
          )}
        </div>
      </SimpleLink>
      <SimpleTooltip display={<p>Sign out</p>} side="top">
        <button
          type="button"
          onClick={handleSignOut}
          aria-label="Sign out"
          className="text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-md transition-colors"
        >
          <SharedIcons.SignOutIcon className="size-4" />
        </button>
      </SimpleTooltip>
    </div>
  );
}

export function AppSidebar() {
  return (
    <Sidebar collapsible="offcanvas">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem className="flex items-center gap-1">
            <SimpleLink
              href="/"
              draggable={false}
              className="flex min-w-0 flex-1 items-center gap-2.5 rounded-md px-2 py-1"
            >
              <Image
                width={24}
                height={24}
                className="size-6 shrink-0"
                src="/assets/logos/scoresaber.png"
                alt="ScoreSaber Logo"
              />
              <span className="truncate text-sm font-semibold">ScoreSaber Reloaded</span>
            </SimpleLink>
            <RealmSelector />
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        {/* Search */}
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <PlayerAndLeaderboardSearch variant="sidebar" />
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Profile */}
        <SidebarGroup className="pt-0 pb-2">
          <SidebarGroupContent>
            <ProfileSection />
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Navigation */}
        <SidebarGroup className="py-0">
          <SidebarGroupContent>
            <SidebarMenu className="gap-0.5">
              <SidebarMenuItem>
                <FriendsPopover />
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {navGroups.map(group => (
          <SidebarGroup key={group.label} className="py-1.5">
            <SidebarGroupLabel className="text-muted-foreground/70 h-6 px-2.5 text-xs font-normal">
              {group.label}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu className="gap-0.5">
                {group.items.map(item => (
                  <SidebarMenuItem key={item.id}>
                    <SidebarNavLink href={item.href} icon={item.icon}>
                      {item.name}
                    </SidebarNavLink>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter className="border-sidebar-border gap-2 border-t p-3">
        <div className="flex flex-wrap gap-x-3 gap-y-1">
          {[...resourceLinks, ...appLinks].map(link => (
            <SimpleLink
              key={link.name}
              href={link.href}
              target="_blank"
              draggable={false}
              className="text-muted-foreground hover:text-foreground text-xs transition-colors"
            >
              {link.shortName ?? link.name}
            </SimpleLink>
          ))}
        </div>
        <div className="flex items-center gap-1">
          {socialLinks.map(link => (
            <SimpleLink
              key={link.name}
              aria-label={link.name}
              className="text-muted-foreground hover:text-foreground hover:bg-sidebar-accent flex size-8 items-center justify-center rounded-md transition-colors"
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
  icon: NavItem["icon"];
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isActive = pathname != null && (pathname === href || (href !== "/" && pathname.startsWith(href)));

  return (
    <SidebarMenuButton asChild isActive={isActive} className={navButtonClass}>
      <SimpleLink href={href} draggable={false}>
        <Icon className="size-[18px]" />
        <span>{children}</span>
      </SimpleLink>
    </SidebarMenuButton>
  );
}
