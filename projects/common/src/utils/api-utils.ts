import Request from "./request";

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
    await Request.get(`${url}/health`);
    return {
      online: true,
    };
  } catch {
    return {
      online: false,
    };
  }
}
