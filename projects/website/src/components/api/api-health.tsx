"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { getApiHealth } from "@ssr/common/utils/api-utils";
import { config } from "../../../config";
import { useToast } from "@/hooks/use-toast";
import { useIsFirstRender } from "@uidotdev/usehooks";

export function ApiHealth() {
  const { toast } = useToast();
  const firstRender = useIsFirstRender();
  const [online, setOnline] = useState<boolean>(true);
  const previousOnlineStatus = useRef<boolean>(true);

  useQuery({
    queryKey: ["api-health"],
    queryFn: async () => {
      const status = (await getApiHealth(config.siteApi)).online;
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
      toast({
        title: `The API is now ${online ? "Online" : "Offline"}!`,
        description: online ? "The API has recovered connectivity." : "The API has lost connectivity.",
        variant: online ? "success" : "destructive",
      });
    }

    // Update the previous online status
    previousOnlineStatus.current = online;
  }, [firstRender, online, toast]);

  return <></>;
}
