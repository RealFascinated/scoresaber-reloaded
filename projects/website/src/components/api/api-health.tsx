"use client";

import { ssrApi } from "@ssr/common/utils/ssr-api";
import { useQuery } from "@tanstack/react-query";
import { useIsFirstRender } from "@uidotdev/usehooks";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

const HEALTH_POLL_DOWN_MS = 1000 * 5;
const HEALTH_POLL_HEALTHY_MS = 1000 * 15;

export function ApiHealth() {
  const firstRender = useIsFirstRender();
  const [online, setOnline] = useState<boolean>(true);
  const previousOnlineStatus = useRef<boolean>(true);

  useQuery({
    queryKey: ["api-health"],
    queryFn: async () => {
      try {
        const online = await ssrApi.health();
        setOnline(online);
        return online;
      } catch {
        // Backend is offline/unreachable — surface it so the connectivity
        // toast fires instead of silently keeping the previous status.
        setOnline(false);
        return false;
      }
    },
    // Check quickly while the API is down so recovery is noticed, and relax while it is healthy
    refetchInterval: query => (query.state.data === false ? HEALTH_POLL_DOWN_MS : HEALTH_POLL_HEALTHY_MS),
  });

  useEffect(() => {
    if (firstRender) {
      return;
    }

    if (previousOnlineStatus.current !== online) {
      if (online) {
        toast.success("The API has now recovered connectivity.", {
          duration: 5_000,
        });
      } else {
        toast.error("The API has lost connectivity, data will be unavailable.", {
          duration: 5_000,
        });
      }
    }

    previousOnlineStatus.current = online;
  }, [firstRender, online, toast]);

  return <></>;
}
