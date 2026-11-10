"use client";

import { sortPpCurve, type PpCurvePoint } from "@ssr/common/leaderboard-curve/pp-curve";
import { ScoreSaberCurve } from "@ssr/common/leaderboard-curve/scoresaber-curve";
import { DEFAULT_REALM_ID } from "@ssr/common/realm";
import type { RealmsResponse } from "@ssr/common/schemas/response/realm/realms";
import { ssrApi } from "@ssr/common/utils/ssr-api";
import { TimeUnit } from "@ssr/common/utils/time-utils";
import { useQuery } from "@tanstack/react-query";
import { createContext, ReactNode, useCallback, useContext, useMemo, useSyncExternalStore } from "react";

const REALM_STORAGE_KEY = "ssr-realm-id";

type RealmContextValue = {
  /** All known realms (empty until loaded). */
  realms: RealmsResponse;
  /** The selected realm ID. */
  realmId: number;
  /** Selects a realm. */
  setRealmId: (realmId: number) => void;
  /** The pp curve of the selected realm, sorted by ascending accuracy. */
  ppCurve: PpCurvePoint[];
  /** The positive modifier curve of the selected realm, sorted by ascending accuracy. */
  positiveModifierCurve: PpCurvePoint[];
  /** Calculates the pp of a score using the selected realm's curve. */
  getPp: (stars: number, accuracy: number) => number;
};

// Outside of the provider (e.g. the overlay) the default realm and curve are used
const RealmContext = createContext<RealmContextValue>({
  realms: [],
  realmId: DEFAULT_REALM_ID,
  setRealmId: () => {},
  ppCurve: ScoreSaberCurve.DEFAULT_CURVE,
  positiveModifierCurve: [],
  getPp: (stars, accuracy) => ScoreSaberCurve.getPp(stars, accuracy),
});

const realmListeners = new Set<() => void>();

function subscribeToRealmId(listener: () => void) {
  realmListeners.add(listener);
  window.addEventListener("storage", listener);
  return () => {
    realmListeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}

function getStoredRealmId(): number {
  try {
    const stored = Number(localStorage.getItem(REALM_STORAGE_KEY));
    return Number.isInteger(stored) && stored > 0 ? stored : DEFAULT_REALM_ID;
  } catch {
    // Storage is unavailable (private mode), use the default realm
    return DEFAULT_REALM_ID;
  }
}

export function RealmProvider({ children }: { children: ReactNode }) {
  // The server (and first client render) use the default realm so the markup matches
  const realmId = useSyncExternalStore(subscribeToRealmId, getStoredRealmId, () => DEFAULT_REALM_ID);

  const { data: realms = [] } = useQuery({
    queryKey: ["realms"],
    queryFn: () => ssrApi.getRealms(),
    staleTime: TimeUnit.toMillis(TimeUnit.Hour, 1),
  });

  // A stored realm may no longer exist, fall back to the default one
  const activeRealmId =
    realms.length === 0 || realms.some(r => r.id === realmId) ? realmId : DEFAULT_REALM_ID;

  const { data: curveData } = useQuery({
    queryKey: ["realm-pp-curve", activeRealmId],
    queryFn: () => ssrApi.getRealmPpCurve(activeRealmId),
    staleTime: TimeUnit.toMillis(TimeUnit.Hour, 1),
  });

  const ppCurve = useMemo(
    () => (curveData ? sortPpCurve(curveData.curve) : ScoreSaberCurve.DEFAULT_CURVE),
    [curveData]
  );
  const positiveModifierCurve = useMemo(
    () => (curveData ? sortPpCurve(curveData.positiveModifierCurve) : []),
    [curveData]
  );

  const setRealmId = useCallback((id: number) => {
    try {
      localStorage.setItem(REALM_STORAGE_KEY, id.toString());
    } catch {
      // Storage is unavailable, the selection can't be persisted
    }
    realmListeners.forEach(listener => listener());
  }, []);

  const getPp = useCallback(
    (stars: number, accuracy: number) => ScoreSaberCurve.getPp(stars, accuracy, ppCurve),
    [ppCurve]
  );

  const value = useMemo(
    () => ({ realms, realmId: activeRealmId, setRealmId, ppCurve, positiveModifierCurve, getPp }),
    [realms, activeRealmId, setRealmId, ppCurve, positiveModifierCurve, getPp]
  );

  return <RealmContext.Provider value={value}>{children}</RealmContext.Provider>;
}

export function useRealm(): RealmContextValue {
  return useContext(RealmContext);
}
