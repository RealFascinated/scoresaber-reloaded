import { HttpResponse, http } from "msw";

export const ACCSABER_API = "https://api.accsaber.com/v1";

export const accSaberApiHandlers = [
  http.get(`${ACCSABER_API}/users/:playerId`, () => new HttpResponse(null, { status: 404 })),
  http.get(`${ACCSABER_API}/users/:playerId/scores`, () => new HttpResponse(null, { status: 404 })),
];
