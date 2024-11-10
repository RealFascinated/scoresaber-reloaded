"use client"; // Error components must be Client Components

import { GlobeAmericasIcon } from "@heroicons/react/24/solid";
import Link from "next/link";

export default function Error() {
  return (
    <div className="flex flex-col items-center justify-center text-center w-full">
      <GlobeAmericasIcon className="h-24 w-24 text-red-500" />
      <h1 className="text-4xl font-bold text-gray-200 mt-6">Oops! Something went wrong.</h1>
      <p className="text-lg text-gray-400 mt-2">
        We&#39;re experiencing some technical difficulties. Please try again later.
      </p>

      <div className="mt-6">
        <Link href="/" className="text-blue-500 hover:underline">
          Go back to the homepage
        </Link>
      </div>
    </div>
  );
}
