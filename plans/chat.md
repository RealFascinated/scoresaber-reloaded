# Chat interface

A chat page for signed-in users. The model answers from tool calls into existing SSR services, never from memory. It talks to any OpenAI-compatible endpoint, so the model is config, not code.

## Goals

- Chat UI on the website with streaming responses and rendered tool results.
- Persistent chat history per user (list, open, rename, delete).
- Context limit set by an env var, with automatic compaction when a chat gets near it.
- Signed-in user info injected into the system prompt, so "me" and "my" resolve.
- A broad tool set over existing services.
- Auto-generated chat titles.
- OpenAI-compatible provider only (`@ai-sdk/openai-compatible`), no provider-specific package.
- No rate limits or spend caps for now (login is the only gate).

## Non-goals (for now)

- Per-user quotas, spend metrics, abuse controls.
- Anonymous access.
- Write actions (follow, pin, settings). Tools are read-only in v1.
- Embeddings, vector search, long-term memory across chats.

## Architecture

```
website /chat (useChat) -> POST /chat/:id/messages (Elysia, auth: true)
  -> load history -> compact if needed -> streamText(tools) -> stream UI messages
  -> persist assistant message (+ tool parts) -> maybe generate title
```

- LLM calls stay in the backend. The website only talks to the backend API.
- Backend uses the Vercel AI SDK (`ai`, `@ai-sdk/openai-compatible`). Website uses `@ai-sdk/react` `useChat`.
- Tool input schemas are TypeBox from `@ssr/common`, passed through `jsonSchema()` (AGENTS.md requires all schemas in `projects/common/src/schemas/`).

## Config (env)

Add to `projects/common/src/env-schema.ts`, `.env-example`, and the backend only.

| Var | Purpose |
| --- | --- |
| `CHAT_ENABLED` | Feature flag. When false, routes return 404 and the nav link is hidden. |
| `CHAT_API_URL` | OpenAI-compatible base URL. |
| `CHAT_API_KEY` | API key. |
| `CHAT_MODEL` | Model id for chat. |
| `CHAT_TITLE_MODEL` | Optional cheaper model for titles and compaction. Defaults to `CHAT_MODEL`. |
| `CHAT_MAX_CONTEXT_TOKENS` | Context window budget. Compaction triggers near this. |
| `CHAT_MAX_STEPS` | Max tool-loop steps per request (default 8). A quality guard, not a spend cap. |

## Database

Schema in `projects/backend/src/db/schema.ts`, then `bunx drizzle-kit generate` and commit `drizzle/` with it.

- `chat-conversations`: `id` (uuid pk), `userId` (fk `auth-users`, cascade), `title` (nullable), `summary` (nullable text, rolling compaction summary), `summarizedUpTo` (nullable, id/ordinal of last message folded into the summary), `createdAt`, `updatedAt`. Index on `(userId, updatedAt desc)`.
- `chat-messages`: `id` (uuid pk), `conversationId` (fk, cascade), `ordinal` (int), `role`, `parts` (jsonb, AI SDK UI message parts incl. tool calls and results), `tokenEstimate` (int), `createdAt`. Unique `(conversationId, ordinal)`.


Storing UI message parts keeps tool-result rendering working when a chat is reopened.

## Backend

New `controller/chat/` and `service/chat/`. Controllers stay thin.

### Routes (all `auth: true`, `private, no-store`)

- `GET /chat/conversations`: paginated list for the user.
- `POST /chat/conversations`: create, returns id.
- `GET /chat/conversations/:id`: messages (excluding anything hidden by compaction only for the model, the UI still shows all).
- `PATCH /chat/conversations/:id`: rename.
- `DELETE /chat/conversations/:id`.
- `POST /chat/conversations/:id/messages`: send a user message, streams the assistant reply. Verify the conversation belongs to the user.

Response and request schemas go in `projects/common/src/schemas/chat/`.

### Services

- `ChatModelService`: builds the provider from env (`createOpenAICompatible`), exposes the chat and title models.
- `ChatConversationService`: CRUD, ownership checks, message persistence.
- `ChatContextService`: token estimation, compaction, assembling model messages.
- `ChatToolsService` (or one file per tool group): tool definitions.
- `ChatTitleService`: title generation.
- `ChatService`: orchestrates a turn.

### Context limit and compaction

- Token estimate: a cheap chars/4 heuristic per message stored in `tokenEstimate`, corrected by real `usage` from the provider when it is returned.
- Budget: `CHAT_MAX_CONTEXT_TOKENS`, minus system prompt and a reserve for the reply (about 20%).
- When history plus new message exceeds about 80% of the budget:
  1. Keep the most recent N messages verbatim (N chosen so they fit in about 40% of the budget).
  2. Summarize older messages, plus any existing `summary`, into a new `summary` with the title model.
  3. Store `summary` and `summarizedUpTo` on the conversation.
  4. Model input becomes: system prompt, summary as a system-level note, recent messages.
- Tool results are the main bloat. Before summarizing, replace old tool results with a one-line stub (tool name, args, "result omitted").
- Run compaction before the turn, not after, so the request always fits. If a single message still does not fit, return a clear 413-style error.
- The UI keeps showing the full history. Only the model input is compacted.

### System prompt and injected user info

Built per request, not stored.

- Role and rules: answer only from tool results, say when data is missing, never invent ranks, PP, or accuracy, keep answers short, link to site pages.
- Injected user block: user name, linked `playerId` (from `auth-users.playerId`), primary connection provider, current realm, today's date.
- If `playerId` is null (no linked profile), tell the model so, and have it ask for a player id or name instead of guessing.
- Tools default to the user's `playerId` when no id is passed.

### Tools (v1, all read-only)

Each is a thin wrapper over an existing service, returns trimmed fields, and caps list sizes (for example 10 to 25 rows).

| Tool | Backed by |
| --- | --- |
| `searchPlayers(query)` | `PlayerSearchService.searchPlayers` |
| `getPlayer(playerId?)` | `PlayerCoreService` / profile service |
| `getPlayerScores(playerId?, sort, page, filters)` | `PlayerScoresService.getScoreSaberPlayerScores` |
| `getPlayerHistory(playerId?, days)` | `PlayerHistoryService` |
| `getPlayerRanking(country?, page)` | `PlayerSearchService.getPlayerRanking` |
| `getLeaderboard(leaderboardId)` | leaderboard services |
| `getLeaderboardScores(leaderboardId, page)` | `getLeaderboardScores` |
| `searchMaps(stars range, query, ranked, ...)` | leaderboard / BeatSaver services |
| `getSuggestedMaps(playerId?)` | `SuggestedMapsService.getSuggestedMaps` |
| `comparePlayers(a, b)` | composed from player services |
| `getFollowing()` | `UserFollowsService` |
| `getMedals(playerId?)` | medals services |
| `resolveMap(query)` | leaderboard and BeatSaver search, returns leaderboard ids for a name or hash |
| `getScoreHistory(playerId?, leaderboardId)` | `PlayerScoreHistoryService` |
| `getRankedBatches(page)` / `getRankedBatch(id)` | ranked batch services |
| `getBeatSaverMap(hashOrKey)` | BeatSaver services (mapper, tags, BPM, duration, difficulties) |
| `getSiteLink(kind, id)` | pure function, builds a site URL for a player, leaderboard or score |
| `getRealms()` | realm config |
| `createPlaylist(title, maps[], description?)` | new, see Playlist tools |
| `getSelfPlaylist(playerId?, settings?)` | `PlaylistService.getSelfPlaylist` |
| `getSnipePlaylist(playerId?, targetId, settings?)` | `PlaylistService.getSnipePlaylist` |
| `getSuggestedMapsPlaylist(playerId?, filters?)` | `PlaylistService.getSuggestedMapsPlaylist` |
| `getRankedBatchPlaylist(rankedBatchId)` | `PlaylistService.getRankedBatchPlaylist` |
| `getRankedMapsPlaylist(kind)` | `PlaylistService` ranked, qualified, ranking queue, trending |

Exact signatures to be confirmed while implementing.

Tool notes:

- `resolveMap` is what lets the model turn "Expert+ of Ghost" into a leaderboard id. The system prompt tells it to use `resolveMap` before any tool that takes a `leaderboardId`, never to guess ids.
- `getSiteLink` is the only way the model produces site URLs, same rule as playlists. The prompt forbids writing URLs by hand.
- `getRealms` lets the model pick a valid realm instead of guessing. Realm-aware tools default to the user's current realm.
- If the tool count hurts selection, merge related tools (one `getPlayerScores` with a `kind` argument) or expose only the tools relevant to the conversation.

### Playlist tools

Playlists are not stored. A playlist tool builds the `.bplist` in memory and returns it to the chat as a file, so there is no table, download route, retention env var, or cleanup cron.

- **Model sees a summary, UI gets the file.** The tool's output holds the full playlist (`{ title, songCount, fileName, bplist }`). Use the AI SDK `toModelOutput` hook so the model only receives `{ title, songCount, fileName }`. The playlist contents never enter the model's context.
- **Existing generators** (`self`, `snipe`, `suggested`, `ranked batch`, `ranked`, `qualified`, `trending`): call the matching `PlaylistService` method directly and return its result as the file. No URL building, so the routes' base64 `settings` param is not needed here; pass the settings object straight to the service.
- **`createPlaylist` (free-form):** the model picks maps itself, for example "the 20 hardest 8-star tech maps I haven't played". Input is a title, an optional description, and a capped list of maps (`leaderboardId`, or `songHash` plus difficulty, max 100). Flow:
  1. Resolve each entry to a song hash and difficulty through the leaderboard and BeatSaver services. Drop and report entries that don't resolve, so the model can say so.
  2. Build the playlist with the existing `playlist-to-bplist` and `playlist-song-utils` helpers.
  3. Return it as the file output.
- **Persistence:** the file lives in the stored message parts (`chat-messages.parts`), so it reappears when the chat is reopened. Playlists are small, but it is the one place a message row can get large, so cap song count and strip the cover image if it is not needed.
- **Compaction:** old playlist tool results fall under the existing "stub old tool results" rule. The file stays in the UI history, only the model input is stubbed.
- **UI:** render the tool part as a file card (playlist icon, file name, song count, Download button). Download is a client-side `Blob` from the part's `bplist`, with `Content-Type: application/json` and a `<slug>.bplist` filename. The model's text only refers to it ("here's your playlist") and never writes a link.
- **Validation:** the `createPlaylist` input schema lives in `@ssr/common/schemas/chat/`. Reject empty lists, and cap title length and song count.

### Streaming and persistence

- `streamText({ model, system, messages, tools, stopWhen: stepCountIs(CHAT_MAX_STEPS) })`, returned as a UI message stream.
- Persist the user message before the model call. Persist the assistant message in `onFinish` (including partial output on abort or error).
- Handle client aborts by passing the request signal into `streamText`.

### Titles

- After the first assistant reply in a conversation with no title, fire and forget a title call with the title model: first user message plus first assistant text, "3 to 6 words, no quotes".
- Save to `title`, never block or fail the turn. The sidebar picks it up on next fetch. Fallback title is the first user message, truncated.

### Observability

Reuse the existing metrics module: counters for turns, tool calls by name, compactions, errors, and histograms for latency and token usage. Log tool errors with conversation id, never message content.

## Website

- Route `app/(pages)/chat/` (and `chat/[id]`), gated behind login. Redirect or show a sign-in prompt when signed out.
- Server Component page shell, client component for the chat itself (`useChat`).
- Layout: conversation list (rename, delete, new chat), message pane, input.
- Render tool parts as existing components where possible (player card, score row, map card, suggested maps), with a text fallback. Assistant text rendered as Markdown with links to site routes.
- States: streaming, tool running ("Looking up player..."), error with retry, empty state with suggested prompts.
- Navbar entry shown only when `CHAT_ENABLED` and signed in.
- Chat requests go through the existing authenticated API client so cookies and the Better Auth session carry over.

## Build order

1. Env vars, provider service, a single `/chat` route that streams plain text (no tools, no persistence). Verify against the real endpoint.
2. Schema and migration, conversation CRUD, message persistence.
3. System prompt with injected user info, first tools (`getPlayer`, `searchPlayers`, `getPlayerScores`).
4. Website chat page with `useChat`, conversation list, basic rendering.
5. Remaining tools and rich tool-result rendering, including the playlist tools and the file card.
6. Context budget and compaction.
7. Title generation.
8. Metrics, polish, suggested prompts.

Each step is shippable behind `CHAT_ENABLED`.

## Testing

- Unit: token estimation, compaction selection (what is kept vs summarized), system prompt building, tool input schemas.
- Integration (`*.integration.test.ts`, real Postgres): conversation CRUD, ownership checks (user B cannot read or write user A's chats), message persistence ordering.
- Model calls in tests go through MSW (`test/helpers/msw-server.ts`) against a fake OpenAI-compatible endpoint, no mocks. Cover a tool-call round trip, a streaming reply, and a title call.
- A small manual eval set of 15 to 20 prompts ("my rank", "ranked 8 star maps", "compare me to X") to run whenever the model or system prompt changes.

## Risks and open questions

- **Tool quality.** With about 25 tools, selection and argument quality depend mostly on the descriptions and schemas, whatever the model. Keep descriptions specific, results small, and run the eval set when the model or prompt changes. The step limit also stops runaway loops.
- **Token counting accuracy.** The heuristic can drift from the real tokenizer. Use provider-reported usage to correct it and keep a safety margin.
- **TypeBox to JSON Schema.** Confirm the AI SDK accepts the generated schemas as-is (some endpoints reject unsupported keywords such as `$id` or format).
- **Streaming through the existing Elysia setup and any proxy.** Check buffering and compression headers on the production proxy.
- **Realm handling.** Decide whether tools take a realm argument or use the user's current realm.
- **Linked profile.** Users without a linked player id get a degraded experience. Decide whether to block chat for them or let them chat about other players.
- **Data exposure.** Only public site data plus the user's own follows. Confirm nothing sensitive (email, sessions) can reach a tool result or the prompt beyond name and player id.
