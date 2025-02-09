"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { getApiHealth } from "@ssr/common/utils/api-utils";
import { useIsFirstRender } from "@uidotdev/usehooks";
import { Config } from "@ssr/common/config";
import { toast } from "sonner";

export function ApiHealth() {
  const firstRender = useIsFirstRender();
  const [online, setOnline] = useState<boolean>(true);
  const previousOnlineStatus = useRef<boolean>(true);

  useQuery({
    queryKey: ["api-health"],
    queryFn: async () => {
      const status = (await getApiHealth(Config.apiUrl)).online;
      setOnline(status);
      return status;
    },
    refetchInterval: 1000 * 15,
  });

  useEffect(() => {
    if (firstRender) {
      return;
    }

    // Trigger toast only if the online status changes
    if (previousOnlineStatus.current !== online) {
      toast(`The API is now ${online ? "Online" : "Offline"}!`, {
        description: online
          ? "The API has recovered connectivity."
          : "The API has lost connectivity, some data may be unavailable.",
        duration: 5_000, // 5 seconds
      });
    }

    // Update the previous online status
    previousOnlineStatus.current = online;
  }, [firstRender, online, toast]);

  return <></>;
}
