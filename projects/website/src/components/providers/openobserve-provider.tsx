"use client";

import { openobserveLogs } from "@openobserve/browser-logs";
import { openobserveRum } from "@openobserve/browser-rum";
import { env } from "@ssr/common/env";
import { useEffect } from "react";

let initialized = false;

export function OpenObserveProvider() {
  useEffect(() => {
    const clientToken = env.NEXT_PUBLIC_OPENOBSERVE_CLIENT_TOKEN;
    const site = env.NEXT_PUBLIC_OPENOBSERVE_SITE;
    if (initialized || !clientToken || !site) {
      return;
    }
    initialized = true;

    const options = {
      clientToken,
      site,
      organizationIdentifier: env.NEXT_PUBLIC_OPENOBSERVE_ORGANIZATION ?? "default",
      service: env.NEXT_PUBLIC_OPENOBSERVE_SERVICE ?? "website",
      env: env.NEXT_PUBLIC_APP_ENV,
      insecureHTTP: false,
      apiVersion: "v1",
    };

    openobserveRum.init({
      ...options,
      applicationId: options.service,
      trackResources: false,
      trackLongTasks: false,
      trackUserInteractions: false,
      defaultPrivacyLevel: "mask-user-input",
      sessionSampleRate: 5,
      sessionReplaySampleRate: 0,
    });

    openobserveLogs.init({
      ...options,
      forwardErrorsToLogs: true,
      sessionSampleRate: 5,
    });
  }, []);

  return null;
}
