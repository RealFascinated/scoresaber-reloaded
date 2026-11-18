import { HttpResponse, http } from "msw";

export const BEATSAVER_API = "https://api.beatsaver.com";

export const beatSaverApiHandlers = [
  http.get(`${BEATSAVER_API}/maps/hash/:hash`, () => new HttpResponse(null, { status: 404 })),
];
