import Card from "@/components/card";
import SimpleLink from "@/components/simple-link";
import { Button } from "@/components/ui/button";
import { SharedIcons } from "@/shared-icons";

type BackendUnavailableProps = {
  /**
   * Optional retry handler for client components. When provided, a "Try Again"
   * button is shown alongside "Return Home".
   */
  onRetry?: () => void;
};

/**
 * Full-width error state shown when the SSR backend is offline or unreachable.
 * Used by server pages (no `onRetry`) and client components (with `onRetry`).
 */
export default function BackendUnavailable({ onRetry }: BackendUnavailableProps) {
  return (
    <div className="flex w-full justify-center">
      <Card className="flex w-full flex-col items-center gap-6 md:w-4xl">
        <SharedIcons.BackendOfflineIcon className="size-16 text-red-400" />

        <div className="flex flex-col items-center gap-2 text-center">
          <h1 className="text-3xl font-bold text-red-400">Backend Unavailable</h1>
          <p className="text-lg">The backend is currently offline or unreachable. Please try again later.</p>
        </div>

        <div className="flex flex-col items-center gap-4">
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <SimpleLink href="/">
              <Button>Return Home</Button>
            </SimpleLink>
            {onRetry && (
              <Button variant="outline" onClick={onRetry}>
                Try Again
              </Button>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}
