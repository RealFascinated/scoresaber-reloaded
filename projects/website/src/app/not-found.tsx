import SimpleLink from "@/components/simple-link";
import { DiscordButton } from "@/components/social/discord-button";
import { Button } from "@/components/ui/button";
import { HomeIcon, SearchIcon } from "lucide-react";

export default function NotFoundPage() {
  return (
    <div className="from-background via-background to-accent-deep/20 min-h-screen w-full bg-gradient-to-br">
      <div className="from-primary/10 absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] via-transparent to-transparent" />

      <div className="relative flex min-h-screen w-full flex-col items-center justify-center px-4 text-center">
        {/* 404 Content */}
        <div className="z-10 flex flex-col items-center gap-8">
          {/* 404 Number */}
          <div className="from-primary to-accent-secondary animate-gradient-slow bg-linear-to-r bg-[length:200%_200%] bg-clip-text text-8xl font-bold text-transparent sm:text-9xl lg:text-[12rem]">
            404
          </div>

          {/* Main Content */}
          <div className="flex flex-col items-center gap-4">
            <h1 className="text-3xl font-bold text-white sm:text-4xl lg:text-5xl">
              Page Not Found
            </h1>
            <p className="text-muted-foreground max-w-md text-lg">
              The page you&apos;re looking for doesn&apos;t exist or has been moved. Don&apos;t
              worry, you can always find your way back!
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <SimpleLink href="/">
              <Button
                size="lg"
                className="border-primary/30 bg-primary/5 text-primary hover:border-primary/50 hover:bg-primary/10 group relative h-12 overflow-hidden rounded-xl border-2 px-8 backdrop-blur-sm transition-all duration-300"
              >
                <div className="from-primary/10 to-accent-secondary/10 absolute inset-0 bg-linear-to-r opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                <HomeIcon className="relative z-10 mr-2 h-5 w-5" />
                <span className="relative z-10 font-semibold">Return Home</span>
              </Button>
            </SimpleLink>

            <SimpleLink href="/search">
              <Button
                size="lg"
                variant="outline"
                className="border-primary/30 bg-primary/5 text-primary hover:border-primary/50 hover:bg-primary/10 group relative h-12 overflow-hidden rounded-xl border-2 px-8 backdrop-blur-sm transition-all duration-300"
              >
                <div className="from-primary/10 to-accent-secondary/10 absolute inset-0 bg-linear-to-r opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                <SearchIcon className="relative z-10 mr-2 h-5 w-5" />
                <span className="relative z-10 font-semibold">Search Players</span>
              </Button>
            </SimpleLink>
          </div>

          {/* Discord Support */}
          <div className="flex flex-col items-center gap-2">
            <p className="text-muted-foreground text-sm">Need help? Join our Discord community!</p>
            <DiscordButton />
          </div>
        </div>
      </div>
    </div>
  );
}
