import { AppStats } from "@/components/landing/app-statistics";
import { SearchButton } from "@/components/landing/search-button";
import { Button } from "@/components/ui/button";
import { ArrowRight, BarChart3, Database, Globe, Heart, Monitor, Star, Users } from "lucide-react";
import Link from "next/link";

export default async function LandingPage() {
  return (
    <div className="from-background via-background to-accent-deep/20 min-h-screen w-full bg-gradient-to-br">
      <div className="from-primary/10 absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] via-transparent to-transparent" />

      <div className="relative">
        {/* Hero Section */}
        <section className="mx-auto max-w-6xl px-4 py-24 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="mb-8">
              <Link
                href="https://github.com/RealFascinated/scoresaber-reloaded"
                target="_blank"
                className="border-primary/20 bg-primary/10 text-primary hover:bg-primary/20 inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm transition-all"
              >
                <Star className="h-4 w-4" />
                <span>Open Source</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            <h1 className="from-primary to-accent-secondary animate-gradient-slow mb-6 bg-gradient-to-r bg-[length:200%_200%] bg-clip-text text-5xl font-bold text-transparent sm:text-6xl lg:text-7xl">
              ScoreSaber Reloaded
            </h1>

            <p className="text-muted-foreground mx-auto mb-8 max-w-2xl text-lg">
              The ultimate platform for Beat Saber players. Track your progress, compete with
              friends, and discover detailed insights about your gameplay like never before.
              Integrates ScoreSaber, AccSaber, and BeatLeader data in one place.
            </p>

            <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
              <SearchButton />

              <Link href="https://discord.gg/kmNfWGA4A8" target="_blank">
                <Button
                  size="lg"
                  variant="outline"
                  className="group border-primary/30 bg-primary/5 text-primary hover:border-primary/50 hover:bg-primary/10 relative h-12 overflow-hidden rounded-xl border-2 px-8 backdrop-blur-sm transition-all duration-300"
                >
                  <div className="from-primary/10 to-accent-secondary/10 absolute inset-0 bg-gradient-to-r opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                  <span className="relative z-10 font-semibold">Join Discord</span>
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-24">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="mb-16 text-center">
              <h2 className="mb-4 text-3xl font-bold sm:text-4xl">
                Why Choose ScoreSaber Reloaded?
              </h2>
              <p className="text-muted-foreground text-lg">
                Everything you need to elevate your Beat Saber experience
              </p>
            </div>

            <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
              <FeatureCard
                icon={<Database className="h-6 w-6" />}
                title="Comprehensive Data"
                description="Access detailed statistics, accuracy breakdowns, and performance metrics that go beyond basic score tracking."
              />

              <FeatureCard
                icon={<Users className="h-6 w-6" />}
                title="Friend System"
                description="Connect with friends, track their progress, and compete together in a social gaming experience."
              />

              <FeatureCard
                icon={<BarChart3 className="h-6 w-6" />}
                title="Advanced Analytics"
                description="Visualize your improvement with detailed charts, trends, and performance insights."
              />

              <FeatureCard
                icon={<Globe className="h-6 w-6" />}
                title="Global Leaderboards"
                description="Compete on global and country leaderboards with real-time rankings and statistics."
              />

              <FeatureCard
                icon={<Monitor className="h-6 w-6" />}
                title="Custom Overlays"
                description="Create beautiful, customizable overlays for your streams with real-time score and player data."
              />

              <FeatureCard
                icon={<Heart className="h-6 w-6" />}
                title="Community Driven"
                description="Built by players, for players. Open source and constantly improving based on community feedback."
              />
            </div>
          </div>
        </section>

        {/* Statistics Section */}
        <section className="py-16">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="mb-12 text-center">
              <h2 className="mb-4 text-2xl font-bold sm:text-3xl">Platform Statistics</h2>
              <p className="text-muted-foreground text-lg">
                Real-time data from our growing community
              </p>
            </div>
            <div className="flex justify-center">
              <AppStats />
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-24">
          <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
            <h2 className="mb-6 text-3xl font-bold sm:text-4xl">
              Ready to Elevate Your Beat Saber Experience?
            </h2>
            <p className="text-muted-foreground mb-8 text-lg">
              Join thousands of players who have already discovered the power of ScoreSaber Reloaded
            </p>
            <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
              <SearchButton />

              <Link href="https://discord.gg/kmNfWGA4A8" target="_blank">
                <Button
                  size="lg"
                  variant="outline"
                  className="group border-primary/30 bg-primary/5 text-primary hover:border-primary/50 hover:bg-primary/10 relative h-12 overflow-hidden rounded-xl border-2 px-8 backdrop-blur-sm transition-all duration-300"
                >
                  <div className="from-primary/10 to-accent-secondary/10 absolute inset-0 bg-gradient-to-r opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                  <span className="relative z-10 font-semibold">Join Discord</span>
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="group border-primary/20 from-accent-deep/50 to-accent/50 relative overflow-hidden rounded-xl border bg-gradient-to-br p-6 transition-all duration-300 hover:scale-105 hover:shadow-xl">
      <div className="relative">
        <div className="bg-primary/10 text-primary mb-4 inline-flex rounded-lg p-3">{icon}</div>
        <h3 className="mb-3 text-xl font-semibold">{title}</h3>
        <p className="text-muted-foreground text-sm leading-relaxed">{description}</p>
      </div>
    </div>
  );
}
