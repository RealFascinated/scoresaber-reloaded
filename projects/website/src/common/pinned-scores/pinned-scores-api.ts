import { USER_PINNED_SCORES_ROUTE } from "@ssr/common/api-routes";
import { env } from "@ssr/common/env";
import type {
  PinnedScoreIdsResponse,
  PinnedScoresResponse,
} from "@ssr/common/schemas/response/user/pinned-scores";

async function pinnedRequest(path: string, method: "GET" | "PUT" | "DELETE" = "GET"): Promise<Response> {
  return fetch(`${env.NEXT_PUBLIC_API_URL}${path}`, { method, credentials: "include" });
}

/**
 * Fetches the ids of the scores the signed-in user pinned.
 *
 * @returns the score ids, empty when nobody is signed in
 * @throws when the backend could not be reached or answered with an error
 */
export async function fetchPinnedScoreIds(): Promise<number[]> {
  const response = await pinnedRequest(USER_PINNED_SCORES_ROUTE);
  if (response.status === 401) {
    return [];
  }
  if (!response.ok) {
    throw new Error(`Failed to fetch your pinned scores (${response.status})`);
  }
  return ((await response.json()) as PinnedScoreIdsResponse).scoreIds;
}

/**
 * Pins or unpins one of the signed-in user's scores.
 *
 * @returns the ids of every score the user pinned afterwards
 * @throws with the backend's message when it was refused
 */
export async function changePinnedScore(scoreId: number, action: "pin" | "unpin"): Promise<number[]> {
  const response = await pinnedRequest(
    `${USER_PINNED_SCORES_ROUTE}/${scoreId}`,
    action === "pin" ? "PUT" : "DELETE"
  );
  if (!response.ok) {
    const body = (await response.json().catch(() => undefined)) as { message?: string } | undefined;
    throw new Error(body?.message ?? `Failed to ${action} the score (${response.status})`);
  }
  return ((await response.json()) as PinnedScoreIdsResponse).scoreIds;
}

/**
 * Sets the message shown on one of the signed-in user's pinned scores.
 *
 * @param message the message, empty to remove it
 * @throws with the backend's message when it was refused
 */
export async function changePinnedScoreMessage(scoreId: number, message: string): Promise<void> {
  const response = await fetch(`${env.NEXT_PUBLIC_API_URL}${USER_PINNED_SCORES_ROUTE}/${scoreId}/message`, {
    method: "PUT",
    credentials: "include",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ message }),
  });
  if (!response.ok) {
    const body = (await response.json().catch(() => undefined)) as { message?: string } | undefined;
    throw new Error(body?.message ?? `Failed to save the message (${response.status})`);
  }
}

/**
 * Fetches the scores a player pinned to the top of their profile.
 *
 * @param realmId the realm to show pp for
 */
export async function fetchPlayerPinnedScores(
  playerId: string,
  realmId?: number
): Promise<PinnedScoresResponse> {
  const query = realmId === undefined ? "" : `?realmId=${realmId}`;
  const response = await pinnedRequest(`/player/${encodeURIComponent(playerId)}/pinned-scores${query}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch the pinned scores of the player (${response.status})`);
  }
  return (await response.json()) as PinnedScoresResponse;
}
