import RequestManager, { RequestPriority } from "./request";

type ApiHealth = {
  online: boolean;
};

/**
 * Gets the health of the api server.
 *
 * @param url the url of the api
 */
export async function getApiHealth(url: string): Promise<ApiHealth> {
  try {
    await RequestManager.get(`${url}/health`, {
      priority: RequestPriority.BACKGROUND,
    });
    return {
      online: true,
    };
  } catch {
    return {
      online: false,
    };
  }
}
