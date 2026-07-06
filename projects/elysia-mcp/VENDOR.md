# Vendored fork

Upstream: [kerlos/elysia-mcp](https://github.com/kerlos/elysia-mcp) @ v0.1.1 (MIT)

## SSR patch (`0.1.2-ssr.0`)

Register MCP transport routes on the exact `basePath` only (`POST` / `GET` / `DELETE`), instead of `.all(\`${basePath}/*\`)`. Serve `GET ${basePath}/openapi.json` from the same registered `McpServer` instance (tool schemas via `x-mcp-tools`).

Previously, any request under `/mcp/*` (e.g. `GET /mcp/openapi.json`) was handled by the MCP JSON-RPC transport. In stateless mode that returned a misleading `405 Method not allowed` JSON-RPC error.
