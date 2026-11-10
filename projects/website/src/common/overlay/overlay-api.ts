import { OVERLAY_ROUTE, USER_OVERLAYS_ROUTE } from "@ssr/common/api-routes";
import { env } from "@ssr/common/env";
import type { BeatLeaderOverlayDataResponse } from "@ssr/common/schemas/response/beatleader/overlay-data";
import type {
  BeatLeaderOverlayPlayerResponse,
  BeatLeaderOverlayRatingsResponse,
} from "@ssr/common/schemas/response/beatleader/overlay-ratings";
import type {
  CreateUserOverlayBody,
  OverlayContent,
  UpdateUserOverlayBody,
  UserOverlay,
  UserOverlayListResponse,
  UserOverlaySummary,
} from "@ssr/common/schemas/response/user/overlay";

async function overlayRequest<TResponse>(
  path: string,
  method: "GET" | "POST" | "PATCH" | "DELETE" = "GET",
  body?: CreateUserOverlayBody | UpdateUserOverlayBody
): Promise<TResponse> {
  const response = await fetch(`${env.NEXT_PUBLIC_API_URL}${path}`, {
    method,
    credentials: "include",
    headers: body ? { "content-type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!response.ok) {
    const error = (await response.json().catch(() => undefined)) as { message?: string } | undefined;
    throw new Error(error?.message ?? `Overlay request failed (${response.status})`);
  }
  return (await response.json()) as TResponse;
}

export async function fetchUserOverlays(): Promise<UserOverlaySummary[]> {
  return (await overlayRequest<UserOverlayListResponse>(USER_OVERLAYS_ROUTE)).items;
}

export function fetchUserOverlay(id: string): Promise<UserOverlay> {
  return overlayRequest<UserOverlay>(`${USER_OVERLAYS_ROUTE}/${id}`);
}

export function createUserOverlay(body: CreateUserOverlayBody): Promise<UserOverlay> {
  return overlayRequest<UserOverlay>(USER_OVERLAYS_ROUTE, "POST", body);
}

export function updateUserOverlay(id: string, body: UpdateUserOverlayBody): Promise<UserOverlay> {
  return overlayRequest<UserOverlay>(`${USER_OVERLAYS_ROUTE}/${id}`, "PATCH", body);
}

export function duplicateUserOverlay(id: string): Promise<UserOverlay> {
  return overlayRequest<UserOverlay>(`${USER_OVERLAYS_ROUTE}/${id}/duplicate`, "POST");
}

export async function deleteUserOverlay(id: string): Promise<void> {
  await overlayRequest<{ deleted: boolean }>(`${USER_OVERLAYS_ROUTE}/${id}`, "DELETE");
}

/** Fetches what is needed to render an overlay (public, no sign in needed). */
export function fetchOverlayContent(id: string): Promise<OverlayContent> {
  return overlayRequest<OverlayContent>(`${OVERLAY_ROUTE}/${id}`);
}

/** The url of the server-sent events stream of an overlay. */
export function getOverlayEventsUrl(id: string): string {
  return `${env.NEXT_PUBLIC_API_URL}${OVERLAY_ROUTE}/${id}/events`;
}

/**
 * Fetches the accuracy for each second of the best BeatLeader score of a player on a map.
 *
 * @returns undefined when the player has no BeatLeader score on the map
 */
export async function fetchPlayerPbData(
  playerId: string,
  hash: string,
  difficulty: string,
  characteristic: string
): Promise<BeatLeaderOverlayDataResponse | undefined> {
  const path = [playerId, hash, difficulty, characteristic].map(encodeURIComponent).join("/");
  const response = await fetch(`${env.NEXT_PUBLIC_API_URL}/beatleader/overlay-data/player/${path}`);
  if (response.status === 404) {
    return undefined;
  }
  if (!response.ok) {
    throw new Error(`Failed to fetch the PB data (${response.status})`);
  }
  return (await response.json()) as BeatLeaderOverlayDataResponse;
}

/**
 * Fetches the BeatLeader ratings of a difficulty.
 *
 * @returns undefined when BeatLeader doesn't know the difficulty
 */
export async function fetchBeatLeaderRatings(
  hash: string,
  difficulty: string,
  characteristic: string
): Promise<BeatLeaderOverlayRatingsResponse | undefined> {
  const path = [hash, difficulty, characteristic].map(encodeURIComponent).join("/");
  const response = await fetch(`${env.NEXT_PUBLIC_API_URL}/beatleader/overlay-data/ratings/${path}`);
  if (response.status === 404) {
    return undefined;
  }
  if (!response.ok) {
    throw new Error(`Failed to fetch the BeatLeader ratings (${response.status})`);
  }
  return (await response.json()) as BeatLeaderOverlayRatingsResponse;
}

/**
 * Fetches the BeatLeader pp and ranks of a player.
 *
 * @returns undefined when the player is not on BeatLeader
 */
export async function fetchBeatLeaderPlayer(
  playerId: string
): Promise<BeatLeaderOverlayPlayerResponse | undefined> {
  const response = await fetch(
    `${env.NEXT_PUBLIC_API_URL}/beatleader/overlay-data/player/${encodeURIComponent(playerId)}`
  );
  if (response.status === 404) {
    return undefined;
  }
  if (!response.ok) {
    throw new Error(`Failed to fetch the BeatLeader player (${response.status})`);
  }
  return (await response.json()) as BeatLeaderOverlayPlayerResponse;
}
