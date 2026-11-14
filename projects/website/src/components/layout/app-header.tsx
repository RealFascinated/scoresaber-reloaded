"use client";

import Avatar from "@/components/avatar";
import { useBreadcrumbPageTitle } from "@/components/layout/breadcrumb-context";
import PlayerAndLeaderboardSearch from "@/components/navbar/player-and-leaderboard-search";
import SimpleLink from "@/components/simple-link";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { useMainPlayer, useMainPlayerId } from "@/hooks/use-main-player";
import { SharedIcons } from "@/shared-icons";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Fragment } from "react";

type Crumb = {
  label: string;
  href?: string;
};

/**
 * Crumbs for the static routes, keyed by path.
 */
const STATIC_CRUMBS: Record<string, Crumb[]> = {
  "/ranking": [{ label: "Ranking" }],
  "/medals": [{ label: "Medals" }],
  "/maps/leaderboards": [{ label: "Maps" }, { label: "Leaderboards" }],
  "/maps/ranking-queue": [{ label: "Maps" }, { label: "Ranking Queue" }],
  "/reweights": [{ label: "Reweights" }],
  "/scores/top": [{ label: "Scores" }, { label: "Top Scores" }],
  "/scores/live": [{ label: "Scores" }, { label: "Live Scores" }],
  "/settings": [{ label: "Settings" }],
};

/**
 * The parent crumb for the dynamic routes, keyed by the first path segment.
 * The page itself is labelled with the title it sets via the breadcrumb context.
 */
const DYNAMIC_ROUTES: Record<string, { parent: Crumb; fallback: string }> = {
  player: { parent: { label: "Ranking", href: "/ranking" }, fallback: "Player" },
  leaderboard: { parent: { label: "Leaderboards", href: "/maps/leaderboards" }, fallback: "Leaderboard" },
  reweights: { parent: { label: "Reweights", href: "/reweights" }, fallback: "Reweight" },
  score: { parent: { label: "Scores", href: "/scores/top" }, fallback: "Score" },
};

/**
 * Builds the crumbs (after "Home") for a path.
 */
function getCrumbs(pathname: string, pageTitle: string | undefined): Crumb[] {
  const staticCrumbs = STATIC_CRUMBS[pathname];
  if (staticCrumbs) {
    return staticCrumbs;
  }

  const route = DYNAMIC_ROUTES[pathname.split("/")[1] ?? ""];
  if (route) {
    return [route.parent, { label: pageTitle ?? route.fallback }];
  }
  return [];
}

function Breadcrumbs() {
  const pathname = usePathname();
  const pageTitle = useBreadcrumbPageTitle();
  const crumbs = getCrumbs(pathname, pageTitle);

  return (
    <nav aria-label="Breadcrumb" className="min-w-0">
      <ol className="flex min-w-0 items-center gap-1.5 text-sm">
        <li className="shrink-0">
          <SimpleLink
            href="/"
            className={
              crumbs.length > 0
                ? "text-muted-foreground hover:text-foreground transition-colors"
                : "text-foreground font-medium"
            }
          >
            Home
          </SimpleLink>
        </li>
        {crumbs.map((crumb, index) => {
          const isLast = index === crumbs.length - 1;
          return (
            <Fragment key={`${crumb.label}-${index}`}>
              <li aria-hidden className="text-muted-foreground/60 shrink-0">
                <SharedIcons.OpenScorePageIcon className="size-3.5" />
              </li>
              <li className={isLast ? "min-w-0" : "shrink-0"}>
                {crumb.href ? (
                  <SimpleLink
                    href={crumb.href}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {crumb.label}
                  </SimpleLink>
                ) : (
                  <span
                    aria-current={isLast ? "page" : undefined}
                    className={
                      isLast ? "text-foreground block truncate font-medium" : "text-muted-foreground"
                    }
                  >
                    {crumb.label}
                  </span>
                )}
              </li>
            </Fragment>
          );
        })}
      </ol>
    </nav>
  );
}

/**
 * Avatar-only link to the signed-in player's profile (mobile).
 */
function MyProfileButton() {
  const mainPlayerId = useMainPlayerId();
  const mainPlayer = useMainPlayer().data;

  if (mainPlayerId == null || mainPlayerId === "") {
    return null;
  }

  return (
    <SimpleLink href={`/player/${mainPlayerId}`} draggable={false} aria-label="My Profile">
      <Avatar
        size={28}
        src={mainPlayer?.avatar ?? ""}
        className="border-border box-border size-7 shrink-0 rounded-full border"
        alt="My Profile"
      />
    </SimpleLink>
  );
}

/**
 * Top bar with the sidebar toggle and a breadcrumb. On mobile (where the sidebar is hidden)
 * it carries the logo and a search shortcut instead of the breadcrumb.
 */
export function AppHeader() {
  return (
    <header className="bg-background/80 border-border/50 sticky top-0 z-20 mb-4 flex h-12 shrink-0 items-center gap-3 border-b px-3 backdrop-blur sm:px-4">
      <SidebarTrigger className="-ml-1" />
      <span className="bg-border hidden h-4 w-px md:block" />
      <div className="hidden min-w-0 md:block">
        <Breadcrumbs />
      </div>
      <SimpleLink href="/" className="flex items-center gap-2 md:hidden" draggable={false}>
        <Image
          width={24}
          height={24}
          className="size-6"
          src="/assets/logos/scoresaber.png"
          alt="ScoreSaber Logo"
        />
        <span className="text-sm font-semibold">SSR</span>
      </SimpleLink>
      <div className="ml-auto flex items-center gap-2 md:hidden">
        <PlayerAndLeaderboardSearch variant="icon" />
        <MyProfileButton />
      </div>
    </header>
  );
}
