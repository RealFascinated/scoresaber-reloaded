"use client";

import { signInWithSteam, signOut } from "@/common/auth/auth-api";
import { cn } from "@/common/utils";
import Avatar from "@/components/avatar";
import { useChatStatus } from "@/components/chat/chat-queries";
import FollowedPlayer from "@/components/following/followed-player";
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
import { FOLLOWING_QUERY_KEY, useFollowing } from "@/hooks/use-following";
import { useMainPlayer, useMainPlayerId } from "@/hooks/use-main-player";
import useMe, { ME_QUERY_KEY } from "@/hooks/use-me";
import { useIsMobile } from "@/hooks/use-mobile";
import { USER_PREFERENCES_QUERY_KEY } from "@/hooks/use-user-preferences";
import { SharedIcons } from "@/shared-icons";
import { CHAT_ROUTE } from "@ssr/common/api-routes";
import { env } from "@ssr/common/env";
import { DEFAULT_USER_PREFERENCES } from "@ssr/common/schemas/user/default-preferences";
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
  logo: ReactElement;
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
      {
        id: "rankedBatches",
        name: "Ranked Batches",
        icon: SharedIcons.RankedBatchesNavIcon,
        href: "/ranked-batches",
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
      { id: "overlay", name: "Overlay", icon: SharedIcons.OverlayNavIcon, href: "/overlay/editor" },
      { id: "settings", name: "Settings", icon: SharedIcons.SettingsNavIcon, href: "/settings" },
    ],
  },
];

function FollowingPopover() {
  const { data: following, isLoading } = useFollowing();
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

  const followingCount = following.length;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <SidebarMenuButton
          className={navButtonClass}
          onClick={() => isMobile && setOpen(prev => !prev)}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          <SharedIcons.FollowingNavIcon className="size-[18px]" />
          <span>Following</span>
          {followingCount > 0 && (
            <span className="ml-auto rounded-md bg-muted px-1.5 py-0.5 text-xs font-medium text-muted-foreground tabular-nums">
              {followingCount}
            </span>
          )}
        </SidebarMenuButton>
      </PopoverTrigger>
      <PopoverContent
        side={isMobile ? "bottom" : "right"}
        sideOffset={isMobile ? 4 : 8}
        onOpenAutoFocus={event => event.preventDefault()}
        className="flex max-h-[420px] w-screen flex-col overflow-hidden p-0 text-sm select-none md:w-[340px]"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <div className="flex items-center justify-between border-b border-border/50 px-3 py-2.5">
          <div className="flex items-center gap-2">
            <SharedIcons.FollowingNavIcon className="size-4 text-muted-foreground" />
            <span className="font-semibold">Following</span>
          </div>
          {followingCount > 0 && (
            <span className="rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground tabular-nums">
              {followingCount}
            </span>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <SharedIcons.PageLoadingIcon className="size-5 animate-spin text-muted-foreground" />
            </div>
          ) : followingCount > 0 ? (
            <div className="flex flex-col gap-px">
              {following
                .sort((a, b) => {
                  if (a.inactive && !b.inactive) {
                    return 1;
                  }
                  if (!a.inactive && b.inactive) {
                    return -1;
                  }
                  return a.rank - b.rank;
                })
                .map(followed => (
                  <FollowedPlayer player={followed} key={followed.id} onClick={() => setOpen(false)} />
                ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center gap-3 py-8">
              <SharedIcons.FollowingNavIcon className="size-10 text-muted-foreground/30" />
              <div className="flex flex-col items-center gap-1">
                <p className="font-medium text-muted-foreground">Not following anyone yet</p>
                <p className="max-w-[220px] text-center text-xs text-muted-foreground/60">
                  Search for players and follow them to see them here
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
  const pathname = usePathname();
  const mainPlayerId = useMainPlayerId();
  const mainPlayer = useMainPlayer().data;
  const queryClient = useQueryClient();

  async function handleSignOut() {
    try {
      await signOut();
      queryClient.setQueryData(ME_QUERY_KEY, null);
      queryClient.setQueryData(USER_PREFERENCES_QUERY_KEY, DEFAULT_USER_PREFERENCES);
      queryClient.setQueryData(FOLLOWING_QUERY_KEY, []);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to sign out");
    }
  }

  if (mainPlayerId == null || mainPlayerId === "") {
    return (
      <button
        type="button"
        onClick={() => signInWithSteam(pathname ?? "/").catch(error => toast.error(error.message))}
        className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-sm text-muted-foreground transition-colors hover:bg-sidebar-accent/60 hover:text-foreground"
      >
        <SharedIcons.SignInIcon className="size-5 shrink-0 text-success" />
        <span className="font-medium">Sign in</span>
      </button>
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
          className="box-border size-8 shrink-0 rounded-full border border-border"
          alt="Your Profile Picture"
        />
        <div className="grid min-w-0 flex-1 leading-tight">
          <span className="truncate text-sm font-medium">{mainPlayer?.name ?? "My Profile"}</span>
          {mainPlayer != undefined && (
            <span className="text-xs text-muted-foreground tabular-nums">
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
          className="flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-sidebar-accent/60 hover:text-foreground"
        >
          <SharedIcons.SignOutIcon className="size-4" />
        </button>
      </SimpleTooltip>
    </div>
  );
}

export function AppSidebar() {
  const { data: me } = useMe();
  const { data: chatEnabled } = useChatStatus(me != null);
  const chatItem: NavItem = {
    id: "chat",
    name: "Chat",
    icon: SharedIcons.ChatNavIcon,
    href: CHAT_ROUTE,
  };
  const groups =
    me != null && chatEnabled
      ? navGroups.map(group =>
          group.label === "Tools" ? { ...group, items: [chatItem, ...group.items] } : group
        )
      : navGroups;

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
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <PlayerAndLeaderboardSearch variant="sidebar" />
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup className="pt-0 pb-2">
          <SidebarGroupContent>
            <ProfileSection />
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup className="py-0">
          <SidebarGroupContent>
            <SidebarMenu className="gap-0.5">
              <SidebarMenuItem>
                <FollowingPopover />
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {groups.map(group => (
          <SidebarGroup key={group.label} className="py-1.5">
            <SidebarGroupLabel className="h-6 px-2.5 text-xs font-normal text-muted-foreground/70">
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

      <SidebarFooter className="gap-2 border-t border-sidebar-border p-3">
        <div className="flex flex-wrap gap-x-3 gap-y-1">
          {[...resourceLinks, ...appLinks].map(link => (
            <SimpleLink
              key={link.name}
              href={link.href}
              target="_blank"
              draggable={false}
              className="text-xs text-muted-foreground transition-colors hover:text-foreground"
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
              className="flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-foreground"
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
