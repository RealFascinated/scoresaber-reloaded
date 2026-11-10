import { env } from "@ssr/common/env";
import type {
  PlayerFollowsResponse,
  PlayerIdListResponse,
} from "@ssr/common/schemas/response/user/following";

async function followingRequest(path: string, method: "GET" | "PUT" | "DELETE" = "GET"): Promise<Response> {
  return fetch(`${env.NEXT_PUBLIC_API_URL}${path}`, { method, credentials: "include" });
}

/**
 * Fetches the ids of the players the signed-in user follows.
 *
 * @returns the player ids, empty when nobody is signed in
 * @throws when the backend could not be reached or answered with an error
 */
export async function fetchFollowing(): Promise<string[]> {
  const response = await followingRequest("/user/following");
  if (response.status === 401) {
    return [];
  }
  if (!response.ok) {
    throw new Error(`Failed to fetch who you follow (${response.status})`);
  }
  return ((await response.json()) as PlayerIdListResponse).playerIds;
}

/**
 * Follows or unfollows a player as the signed-in user.
 *
 * @returns everyone the user follows afterwards
 * @throws with the backend's message when it was refused
 */
export async function changeFollowing(playerId: string, action: "follow" | "unfollow"): Promise<string[]> {
  const response = await followingRequest(
    `/user/following/${encodeURIComponent(playerId)}`,
    action === "follow" ? "PUT" : "DELETE"
  );
  if (!response.ok) {
    const body = (await response.json().catch(() => undefined)) as { message?: string } | undefined;
    throw new Error(body?.message ?? `Failed to ${action} the player (${response.status})`);
  }
  return ((await response.json()) as PlayerIdListResponse).playerIds;
}

/**
 * Fetches how many users follow a player and how many players they follow.
 */
export async function fetchPlayerFollows(playerId: string): Promise<PlayerFollowsResponse> {
  const response = await followingRequest(`/player/${encodeURIComponent(playerId)}/follows`);
  if (!response.ok) {
    throw new Error(`Failed to fetch the follows of the player (${response.status})`);
  }
  return (await response.json()) as PlayerFollowsResponse;
}

/**
 * Fetches the ids of the players that follow a player, or that a player follows.
 */
export async function fetchPlayerFollowList(
  playerId: string,
  list: "followers" | "following"
): Promise<string[]> {
  const response = await followingRequest(`/player/${encodeURIComponent(playerId)}/${list}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch the ${list} of the player (${response.status})`);
  }
  return ((await response.json()) as PlayerIdListResponse).playerIds;
}
