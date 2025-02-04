import { ssrGet } from "./request";

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
    await ssrGet(`${url}/health`);
    return {
      online: true,
    };
  } catch {
    return {
      online: false,
    };
  }
}
