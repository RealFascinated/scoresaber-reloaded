import ky from "ky";

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
    await ky
      .get(url, {
        cache: "no-cache",
      })
      .json();
    return {
      online: true,
    };
  } catch {
    return {
      online: false,
    };
  }
}
