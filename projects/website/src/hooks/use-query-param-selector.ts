"use client";

import { usePathname, useSearchParams } from "next/navigation";
import type { SingleParserBuilder } from "nuqs";
import { useQueryState } from "nuqs";
import { useCallback } from "react";

type ParserWithDefault<T extends NonNullable<unknown>> = SingleParserBuilder<T> & {
  readonly defaultValue: T;
};

export type QueryParamSelectorOptions<T extends NonNullable<unknown>> = {
  /**
   * Query param key to manage (ex: "mode").
   */
  param: string;
  /**
   * nuqs parser (must have a default value via `.withDefault(...)`).
   */
  parser: ParserWithDefault<T>;
  /**
   * If true, the URL will be replaced with ONLY this param (or none if omitted).
   * Defaults to false.
   */
  clearOtherParams?: boolean;
  /**
   * Omit this param from the URL when the predicate returns true.
   * Defaults to omitting when value === parser.defaultValue.
   */
  omitParamWhen?: (value: T) => boolean;
  /**
   * Optional callback invoked right before mutating URL/query state (ex: setIsLoading(true)).
   */
  onStartTransition?: () => void;
};

export function useQueryParamSelector<T extends NonNullable<unknown>>(
  options: QueryParamSelectorOptions<T>
): { value: T; setValue: (next: T) => void } {
  const { param, parser, clearOtherParams = false, omitParamWhen, onStartTransition } = options;

  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [value, setQueryState] = useQueryState(param, parser);

  const setValue = useCallback(
    (next: T) => {
      onStartTransition?.();

      const shouldOmit = omitParamWhen ? omitParamWhen(next) : next === parser.defaultValue;

      const nextParams = clearOtherParams
        ? new URLSearchParams()
        : new URLSearchParams(searchParams.toString());

      if (shouldOmit) {
        nextParams.delete(param);
      } else {
        nextParams.set(param, parser.serialize(next));
      }

      const qs = nextParams.toString();
      const nextUrl = qs ? `${pathname}?${qs}` : pathname;

      // Replace URL immediately (and optionally clear unrelated params)
      window.history.replaceState({}, "", nextUrl);

      // Keep nuqs state in-sync (default values won't be written to URL)
      setQueryState(shouldOmit ? null : next);
    },
    [onStartTransition, omitParamWhen, parser, clearOtherParams, searchParams, param, pathname, setQueryState]
  );

  return { value, setValue };
}
