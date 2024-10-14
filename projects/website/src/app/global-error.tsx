"use client";

import { GlobeAmericasIcon } from "@heroicons/react/24/solid";
import Link from "next/link";
import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";
import Card from "@/components/card";

/**
 * Error page component for handling global errors.
 *
 * @param error - The error object passed to the component.
 */
export default function ErrorPage({ error }: { error: Error & { digest?: string } }) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <Card>
      <div className="flex flex-col items-center justify-center text-center h-screen">
        <GlobeAmericasIcon className="h-24 w-24 text-red-500" />
        <h1 className="text-4xl font-bold text-gray-200 mt-6">Oops! Something went wrong.</h1>
        <p className="text-lg text-gray-400 mt-2">
          We&#39;re experiencing some technical difficulties. Please try again later.
        </p>
        {error?.digest && <p className="text-sm text-gray-500 mt-1">Error Code: {error.digest}</p>}

        <div className="mt-6">
          <Link href="/" className="text-blue-500 hover:underline">
            Go back to the homepage
          </Link>
        </div>
      </div>
    </Card>
  );
}
