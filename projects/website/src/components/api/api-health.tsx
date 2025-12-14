"use client";

import { ssrApi } from "@ssr/common/utils/ssr-api";
import { useQuery } from "@tanstack/react-query";
import { useIsFirstRender } from "@uidotdev/usehooks";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

export function ApiHealth() {
  const firstRender = useIsFirstRender();
  const [online, setOnline] = useState<boolean>(true);
  const previousOnlineStatus = useRef<boolean>(true);

  useQuery({
    queryKey: ["api-health"],
    queryFn: async () => {
      const online = await ssrApi.health();
      setOnline(online);
      return online;
    },
    refetchInterval: 1000 * 5,
  });

  useEffect(() => {
    if (firstRender) {
      return;
    }

    // Trigger toast only if the online status changes
    if (previousOnlineStatus.current !== online) {
      if (online) {
        toast.success("The API has now recovered connectivity.", {
          duration: 5_000, // 5 seconds
        });
      } else {
        toast.error("The API has lost connectivity, data will be unavailable.", {
          duration: 5_000, // 5 seconds
        });
      }
    }

    // Update the previous online status
    previousOnlineStatus.current = online;
  }, [firstRender, online, toast]);

  return <></>;
}
