import { prefetchInitialData, prefetchTimestampedData } from "@/common/server-prefetch";
import { LandingBackground } from "@/components/landing/landing-background";
import { LandingStats } from "@/components/landing/landing-stats";
import { LandingTopPlayers } from "@/components/landing/landing-top-players";
import PlayerAndLeaderboardSearch from "@/components/navbar/player-and-leaderboard-search";
import SimpleLink from "@/components/simple-link";
import { DiscordButton } from "@/components/social/discord-button";
import { Button } from "@/components/ui/button";
import { SharedIcons } from "@/shared-icons";
import { ssrApi } from "@ssr/common/utils/ssr-api";

// The landing page would otherwise be prerendered once at build time, freezing the stats
export const revalidate = 300;

const TOP_PLAYER_COUNT = 5;

const EXPLORE_LINKS = [
  {
    icon: SharedIcons.RankingNavIcon,
    label: "Rankings",
    href: "/ranking",
    desc: "Global and country player leaderboards",
  },
  {
    icon: SharedIcons.GlobalScoresModeIcon,
    label: "Live Scores",
    href: "/scores/live",
    desc: "Scores as they are set, in real time",
  },
  {
    icon: SharedIcons.TopScoresNavIcon,
    label: "Top Scores",
    href: "/scores/top",
    desc: "The highest pp plays ever set",
  },
  {
    icon: SharedIcons.MapsNavIcon,
    label: "Maps",
    href: "/maps/leaderboards",
    desc: "Ranked maps and the ranking queue",
  },
  {
    icon: SharedIcons.MedalsNavIcon,
    label: "Medals",
    href: "/medals",
    desc: "Who holds the most top-10 finishes",
  },
];

const FEATURES = [
  {
    icon: SharedIcons.FollowingSystemFeatureIcon,
    title: "Following",
    desc: "Follow players and keep tabs on them across multiple platforms in one unified list.",
  },
  {
    icon: SharedIcons.AdvancedAnalyticsFeatureIcon,
    title: "Advanced Analytics",
    desc: "Charts, trends, and stat breakdowns to help you understand your play.",
  },
  {
    icon: SharedIcons.CustomOverlaysFeatureIcon,
    title: "Custom Overlays",
    desc: "Build live overlays for your streams with real-time data.",
  },
  {
    icon: SharedIcons.CommunityDrivenFeatureIcon,
    title: "Open Source",
    desc: "Community-built and open source. Contributions welcome on GitHub.",
  },
];

export default async function LandingPage() {
  const [initialStatistics, ranking] = await Promise.all([
    prefetchTimestampedData(ssrApi.getAppStatistics()),
    prefetchInitialData(ssrApi.searchPlayersRanking(1)),
  ]);
  const topPlayers = ranking?.items.slice(0, TOP_PLAYER_COUNT) ?? [];
  const hasTopPlayers = topPlayers.length > 0;

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-20 px-2 pt-10 pb-20 sm:px-4 lg:pt-16">
      <LandingBackground />

      <section
        className={
          hasTopPlayers
            ? "grid items-center gap-10 lg:grid-cols-[minmax(0,1fr)_26rem] lg:gap-14"
            : "flex flex-col items-center text-center"
        }
      >
        <div
          className={`flex flex-col ${hasTopPlayers ? "items-center text-center lg:items-start lg:text-left" : "items-center"}`}
        >
          <h1 className="text-foreground mb-5 text-5xl font-bold tracking-tight text-balance sm:text-6xl lg:text-7xl">
            ScoreSaber <span className="text-brand">Reloaded</span>
          </h1>
          <p className="text-muted-foreground mb-8 max-w-xl text-lg leading-relaxed text-balance">
            A modern companion for Beat Saber players. Track your stats, analyse your scores, and keep up with
            friends.
          </p>
          <div className="mb-5 w-full max-w-md">
            <PlayerAndLeaderboardSearch />
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3 lg:justify-start">
            <SimpleLink href="/ranking">
              <Button size="lg" className="rounded-xl px-6 font-semibold">
                View Rankings
              </Button>
            </SimpleLink>
            <DiscordButton />
          </div>
        </div>

        {hasTopPlayers && <LandingTopPlayers players={topPlayers} />}
      </section>

      <section className="flex flex-col gap-4">
        <SectionHeading title="Statistics" desc="See the current website statistics." />
        <LandingStats initial={initialStatistics} />
      </section>

      <section className="flex flex-col gap-4">
        <SectionHeading title="Explore" desc="Jump straight to one of our pages." />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {EXPLORE_LINKS.map(({ icon: Icon, label, href, desc }) => (
            <SimpleLink
              key={label}
              href={href}
              className="group ring-border bg-card hover:bg-accent hover:ring-brand/40 flex flex-col gap-1 rounded-xl p-4 ring-1 transition-colors"
            >
              <Icon className="text-muted-foreground group-hover:text-brand mb-2 size-5 transition-colors" />
              <span className="text-foreground font-semibold">{label}</span>
              <span className="text-muted-foreground text-xs leading-relaxed">{desc}</span>
            </SimpleLink>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <SectionHeading title="Why Reloaded" desc="See some reasons why people choose us." />
        <div className="grid gap-3 sm:grid-cols-2">
          {FEATURES.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="ring-border bg-card flex items-start gap-4 rounded-xl p-5 ring-1">
              <div className="bg-primary/15 flex size-10 shrink-0 items-center justify-center rounded-lg">
                <Icon className="text-brand size-5" />
              </div>
              <div>
                <h3 className="text-foreground mb-1 font-semibold">{title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="ring-border bg-card flex flex-col items-center gap-5 rounded-2xl px-6 py-12 text-center ring-1">
        <h2 className="text-foreground text-3xl font-bold tracking-tight">Ready to dive in?</h2>
        <p className="text-muted-foreground max-w-lg text-balance">
          Look yourself up, browse the rankings, or explore what maps are out there.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <SimpleLink href="/ranking">
            <Button size="lg" className="rounded-xl px-6 font-semibold">
              View Rankings
            </Button>
          </SimpleLink>
          <SimpleLink href="/maps/leaderboards">
            <Button variant="outline" size="lg" className="rounded-xl px-6 font-semibold">
              Browse Maps
            </Button>
          </SimpleLink>
        </div>
      </section>
    </div>
  );
}

function SectionHeading({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="flex flex-col gap-1">
      <h2 className="text-foreground text-xl font-bold tracking-tight">{title}</h2>
      <p className="text-muted-foreground text-sm">{desc}</p>
    </div>
  );
}
