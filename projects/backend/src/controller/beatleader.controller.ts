import { Elysia, t } from "elysia";
import BeatLeaderService from "../service/beatleader.service";

export default function beatleaderController(app: Elysia) {
  return app.group("/beatleader", app =>
    app.get(
      "/scorestats/:id",
      async ({ params: { id } }) => {
        return await BeatLeaderService.getScoresFullScoreStats(id);
      },
      {
        tags: ["BeatLeader"],
        params: t.Object({
          id: t.Number({ required: true }),
        }),
        detail: {
          description: "Fetch score stats for a BeatLeader score",
        },
      }
    )
  );
}
