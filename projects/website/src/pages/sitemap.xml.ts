import { env } from "@ssr/common/env";
import request from "@ssr/common/utils/request";
import { NextApiRequest, NextApiResponse } from "next";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const links: string[] = [];

    const playerIds = await request.get<string[]>(
      `${env.NEXT_PUBLIC_API_URL}/sitemap-data/player-ids?token=${env.SITEMAP_DATA_TOKEN}`
    );

    const leaderboardIds = await request.get<string[]>(
      `${env.NEXT_PUBLIC_API_URL}/sitemap-data/leaderboard-ids?token=${env.SITEMAP_DATA_TOKEN}`
    );

    if (playerIds && playerIds.length > 0) {
      playerIds.forEach(playerId => {
        links.push(
          `<url><loc>${env.NEXT_PUBLIC_WEBSITE_URL}/player/${playerId}</loc><changefreq>daily</changefreq><priority>0.5</priority></url>`
        );
      });
    }

    if (leaderboardIds && leaderboardIds.length > 0) {
      leaderboardIds.forEach(leaderboardId => {
        links.push(
          `<url><loc>${env.NEXT_PUBLIC_WEBSITE_URL}/leaderboard/${leaderboardId}</loc><changefreq>daily</changefreq><priority>0.5</priority></url>`
        );
      });
    }

    const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${links.join("\n")}
</urlset>`;

    res.setHeader("Content-Type", "application/xml");
    res.setHeader("Cache-Control", "public, s-maxage=86400, stale-while-revalidate");
    res.status(200).send(sitemap);
  } catch (error) {
    console.error("Error generating sitemap:", error);
    res.status(500).json({ message: "Error generating sitemap" });
  }
}
