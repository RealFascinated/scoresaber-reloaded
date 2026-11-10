"use client";

import { isServer, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactNode } from "react";

type Props = {
  children: ReactNode;
};

function makeQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 1000 * 30,
        retry: true,
        retryDelay: 1000 * 5,
      },
    },
  });
}

let browserQueryClient: QueryClient | undefined;

/**
 * On the server every render gets its own client. A client shared between requests would hand one visitor's
 * data (their session, or server data seeded for another page) to the next visitor, and never release it.
 * The browser keeps a single client for the lifetime of the page.
 */
function getQueryClient(): QueryClient {
  if (isServer) {
    return makeQueryClient();
  }

  browserQueryClient ??= makeQueryClient();
  return browserQueryClient;
}

export function QueryProvider({ children }: Props) {
  return <QueryClientProvider client={getQueryClient()}>{children}</QueryClientProvider>;
}
