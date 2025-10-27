import { useCallback, useEffect } from "react";
import usePageNavigation from "./use-page-navigation";

export interface UrlSegment {
  value: string | number;
  condition?: boolean;
}

export interface QueryParam {
  key: string;
  value: string | number | boolean | undefined | null;
  condition?: boolean;
}

export interface UrlBuilderConfig {
  basePath: string;
  segments?: UrlSegment[];
  queryParams?: QueryParam[];
  currentPage: number;
}

export function useUrlBuilder(config: UrlBuilderConfig) {
  const { changePageUrl } = usePageNavigation();

  const buildUrl = useCallback(
    (page: number) => {
      const { basePath, segments = [], queryParams = [] } = config;

      // Build path segments
      const pathSegments = segments
        .filter(segment => segment.condition !== false)
        .map(segment => String(segment.value));

      const fullPath = [basePath, ...pathSegments].join("/");

      // Build query parameters
      const queryString = queryParams
        .filter(
          param =>
            param.condition !== false &&
            param.value !== undefined &&
            param.value !== null &&
            param.value !== ""
        )
        .map(param => `${param.key}=${encodeURIComponent(String(param.value))}`)
        .join("&");

      const querySuffix = queryString ? `?${queryString}` : "";

      return `${fullPath}${querySuffix}`;
    },
    [config]
  );

  // Update URL when dependencies change
  useEffect(() => {
    changePageUrl(buildUrl(config.currentPage));
  }, [config, changePageUrl, buildUrl]);

  return { buildUrl };
}
