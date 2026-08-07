import { LandingBackground } from "@/components/landing/landing-background";
import { LandingStats } from "@/components/landing/landing-stats";
import PlayerAndLeaderboardSearch from "@/components/navbar/player-and-leaderboard-search";
import SimpleLink from "@/components/simple-link";
import { DiscordButton } from "@/components/social/discord-button";
import { Button } from "@/components/ui/button";
import { SharedIcons } from "@/shared-icons";

export default async function LandingPage() {
  return (
    <div className="flex w-full flex-col items-center">
      <LandingBackground />
      {/* Hero */}
      <section className="flex w-full flex-col items-center px-6 py-20 text-center">
        <h1 className="text-foreground mb-4 text-5xl font-bold tracking-tight sm:text-6xl">
          ScoreSaber Reloaded
        </h1>
        <p className="text-muted-foreground mb-10 max-w-2xl text-lg leading-relaxed text-balance">
          A modern companion for Beat Saber players. Track your stats, analyse your scores, and keep up with
          friends across ScoreSaber, BeatLeader, and AccSaber.
        </p>
        <div className="w-full max-w-sm">
          <PlayerAndLeaderboardSearch />
        </div>
      </section>

      {/* Stats */}
      <section className="mx-auto w-full max-w-4xl px-6">
        <LandingStats />
      </section>

      {/* Quick links */}
      <section className="mx-auto mt-16 grid w-full max-w-4xl grid-cols-2 gap-4 px-6 sm:grid-cols-4">
        {[
          {
            icon: SharedIcons.RankingNavIcon,
            label: "Rankings",
            href: "/ranking",
            desc: "Player leaderboards",
          },
          {
            icon: SharedIcons.GlobalScoresModeIcon,
            label: "Live Scores",
            href: "/scores/live",
            desc: "Real-time feed",
          },
          {
            icon: SharedIcons.TopScoresNavIcon,
            label: "Top Scores",
            href: "/scores/top",
            desc: "Highest PP plays",
          },
          {
            icon: SharedIcons.MapsNavIcon,
            label: "Maps",
            href: "/maps/leaderboards",
            desc: "Browse leaderboards",
          },
        ].map(({ icon: Icon, label, href, desc }) => (
          <SimpleLink
            key={label}
            href={href}
            className="ring-border bg-card hover:bg-accent flex flex-col gap-1 rounded-xl p-5 text-left ring-1 transition-colors"
          >
            <Icon className="text-muted-foreground mb-2 h-5 w-5" />
            <span className="text-foreground font-semibold">{label}</span>
            <span className="text-muted-foreground text-xs">{desc}</span>
          </SimpleLink>
        ))}
      </section>

      {/* Features */}
      <section className="mx-auto mt-16 grid w-full max-w-4xl gap-4 px-6 sm:grid-cols-2">
        {[
          {
            icon: SharedIcons.FriendSystemFeatureIcon,
            title: "Friend System",
            desc: "Keep tabs on friends across multiple platforms in one unified list.",
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
        ].map(({ icon: Icon, title, desc }) => (
          <div key={title} className="ring-border bg-card flex items-start gap-4 rounded-xl p-5 ring-1">
            <div className="bg-primary/10 mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg">
              <Icon className="text-primary h-5 w-5" />
            </div>
            <div>
              <h3 className="text-foreground mb-1 font-semibold">{title}</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">{desc}</p>
            </div>
          </div>
        ))}
      </section>

      {/* Get started */}
      <section className="mt-20 mb-20 flex flex-col items-center gap-6 px-6 text-center">
        <h2 className="text-foreground text-3xl font-bold tracking-tight">Ready to dive in?</h2>
        <p className="text-muted-foreground max-w-lg text-balance">
          Search for a player, browse the rankings, or explore what maps are out there.
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
          <DiscordButton />
        </div>
      </section>
    </div>
  );
}
