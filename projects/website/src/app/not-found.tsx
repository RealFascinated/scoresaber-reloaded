import PagesLayout from "@/app/(pages)/layout";
import NotFound from "@/components/not-found";
import { NotFoundSearchButton } from "@/components/not-found-search-button";
import { DiscordButton } from "@/components/social/discord-button";

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
