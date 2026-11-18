const PORT = Number(process.env.FAKE_UPSTREAM_PORT ?? 3128);
const DELAY_MS = Number(process.env.FAKE_UPSTREAM_DELAY_MS ?? 20);
const PLAYER_BASE = 76561198000000000n;
const ITEMS_PER_PAGE = 12;
const SCORES_PER_LEADERBOARD = 500;

function playerIdFor(leaderboardId: number, rank: number) {
  return (PLAYER_BASE + BigInt((leaderboardId * 7919 + rank * 104729) % 20000) + 1n).toString();
}

function buildScoresPage(leaderboardId: number, page: number) {
  const first = (page - 1) * ITEMS_PER_PAGE + 1;
  const scores = [];
  for (let rank = first; rank < first + ITEMS_PER_PAGE && rank <= SCORES_PER_LEADERBOARD; rank++) {
    const playerId = playerIdFor(leaderboardId, rank);
    const baseScore = 800000 + leaderboardId - rank * 900;
    scores.push({
      id: leaderboardId * 1000 + rank,
      leaderboardPlayerInfo: {
        id: playerId,
        name: `Player${playerId.slice(-5)}`,
        profilePicture: `https://cdn.example.com/avatar/${playerId}.jpg`,
        country: "US",
        permissions: 0,
        badges: "",
        role: "",
      },
      rank,
      baseScore,
      modifiedScore: baseScore,
      pp: Math.max(0, 400 - rank * 0.8),
      weight: 1,
      modifiers: "",
      multiplier: 1,
      badCuts: rank % 3,
      missedNotes: rank % 5,
      maxCombo: 500 + (leaderboardId % 300),
      fullCombo: rank % 7 === 0,
      hmd: 64,
      hasReplay: false,
      timeSet: new Date(Date.now() - rank * 3_600_000).toISOString(),
      deviceHmd: "Quest 3",
      deviceControllerLeft: "Touch",
      deviceControllerRight: "Touch",
    });
  }
  return {
    scores,
    metadata: { total: SCORES_PER_LEADERBOARD, page, itemsPerPage: ITEMS_PER_PAGE },
  };
}

Bun.serve({
  port: PORT,
  async fetch(request) {
    const target = decodeURIComponent(new URL(request.url).pathname.slice(1));
    if (DELAY_MS > 0) {
      await Bun.sleep(DELAY_MS);
    }
    const match = target.match(/leaderboard\/by-id\/(\d+)\/scores\?page=(\d+)/);
    if (match) {
      return Response.json(buildScoresPage(Number(match[1]), Number(match[2])));
    }
    return new Response("not found", { status: 404 });
  },
});
console.log(`fake upstream on :${PORT} delay=${DELAY_MS}ms`);
