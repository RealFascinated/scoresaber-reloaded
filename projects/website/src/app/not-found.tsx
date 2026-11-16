import PagesLayout from "@/app/(pages)/layout";
import NotFound from "@/components/not-found";
import { NotFoundSearchButton } from "@/components/not-found-search-button";
import { DiscordButton } from "@/components/social/discord-button";
import type { Metadata } from "next";

// Replaces the root layout's "index, follow" robots (including googleBot) so 404s only emit noindex
export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
    googleBot: {
      index: false,
      follow: false,
    },
  },
};

export default function NotFoundPage() {
  return (
    <PagesLayout>
      <NotFound
        title="Page Not Found"
        description="The page you're looking for doesn't exist or has been moved."
        actions={<NotFoundSearchButton />}
        footer={
          <div className="flex flex-col items-center gap-2">
            <p className="text-muted-foreground text-sm">Need help? Join our Discord community!</p>
            <DiscordButton />
          </div>
        }
      />
    </PagesLayout>
  );
}
