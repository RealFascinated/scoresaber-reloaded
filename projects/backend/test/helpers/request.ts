import type { Elysia } from "elysia";

export type TestResponse = {
  status: number;
  headers: Headers;
  json: () => Promise<unknown>;
  text: () => Promise<string>;
};

export async function request(app: Elysia, path: string, init: RequestInit = {}): Promise<TestResponse> {
  const url = path.startsWith("http") ? path : `http://localhost${path.startsWith("/") ? path : `/${path}`}`;
  const response = await app.handle(
    new Request(url, {
      ...init,
      headers: {
        accept: "application/json",
        ...(init.headers ?? {}),
      },
    })
  );

  return {
    status: response.status,
    headers: response.headers,
    json: async () => {
      const text = await response.text();
      if (!text) {
        return null;
      }
      return JSON.parse(text) as unknown;
    },
    text: async () => response.text(),
  };
}
