# ScoreSaber Reloaded 🎮

> [!IMPORTANT]
> This project is a work-in-progress. If you have an issue, please create one [here](https://github.com/RealFascinated/scoresaber-reloaded/issues/new).

ScoreSaber Reloaded is a new way to view your scores and get more stats about you and your plays. </br>
🌟 Users, go to [ssr.fascinated.cc](https://ssr.fascinated.cc) to view the app.

## Community 🤝

Join our [**Discord**](https://discord.gg/kmNfWGA4A8) to get support, discuss the project, and more!

## MCP (Model Context Protocol)

The SSR backend exposes a public MCP endpoint for AI assistants at `POST /mcp`:

- Production: `https://ssr-api.fascinated.cc/mcp`
- Local dev: `http://localhost:8080/mcp`
- Tool catalog (OpenAPI): `GET /mcp/openapi.json`

Add to Cursor (`~/.cursor/mcp.json` or project `.cursor/mcp.json`):

```json
{
  "mcpServers": {
    "ssr": {
      "url": "https://ssr-api.fascinated.cc/mcp"
    }
  }
}
```

### Tools

| Tool                         | Description                                 |
| ---------------------------- | ------------------------------------------- |
| `search_players`             | Find players by name                        |
| `get_player`                 | Player profile (rank, PP, medals, streaks)  |
| `get_player_scores`          | Paginated ranked scores for a player        |
| `search_leaderboards`        | Search maps by filters                      |
| `get_leaderboard`            | Map and leaderboard details (by ID or hash) |
| `get_leaderboard_scores`     | Scores on a leaderboard page                |
| `get_global_ranking`         | PP ranking page                             |
| `get_medal_ranking`          | Medal ranking page                          |
| `get_score`                  | Single score details                        |
| `get_top_scores`             | Recent top plays                            |
| `get_beatleader_score_stats` | Per-hand miss/accuracy analysis for a score |

Responses use slim MCP-specific types in `@ssr/common` (`projects/common/src/schemas/mcp/`)—not the full REST API payloads. REST endpoints remain unchanged for the website.

Test with the MCP Inspector:

```bash
npx @modelcontextprotocol/inspector --transport http http://localhost:8080/mcp
```

## License 📄

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Stars ⭐

[![Star History Chart](https://api.star-history.com/svg?repos=RealFascinated/scoresaber-reloaded&type=Timeline)](https://star-history.com/#RealFascinated/scoresaber-reloaded&Timeline)
