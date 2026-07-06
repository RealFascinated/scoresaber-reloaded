import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import {
  normalizeObjectSchema,
  type AnyObjectSchema,
} from '@modelcontextprotocol/sdk/server/zod-compat.js';
import { toJsonSchemaCompat } from '@modelcontextprotocol/sdk/server/zod-json-schema-compat.js';

interface JsonSchemaObject {
  [key: string]:
    | string
    | number
    | boolean
    | null
    | JsonSchemaObject
    | JsonSchemaObject[];
}

const EMPTY_OBJECT_JSON_SCHEMA: JsonSchemaObject = {
  type: 'object',
  properties: {},
};

interface RegisteredMcpTool {
  enabled: boolean;
  title?: string;
  description?: string;
  inputSchema?: AnyObjectSchema;
  outputSchema?: AnyObjectSchema;
  annotations?: Record<string, string | number | boolean>;
}

interface McpServerWithTools {
  _registeredTools: Record<string, RegisteredMcpTool>;
}

export interface McpToolDefinition {
  name: string;
  title?: string;
  description?: string;
  inputSchema: JsonSchemaObject;
  outputSchema?: JsonSchemaObject;
  annotations?: Record<string, string | number | boolean>;
}

export interface McpOpenApiDocument {
  openapi: '3.1.0';
  info: {
    title: string;
    version: string;
    description: string;
  };
  servers: {
    url: string;
  }[];
  paths: Record<string, object>;
  'x-mcp-tools': McpToolDefinition[];
}

function toJsonSchema(schema: AnyObjectSchema | undefined): JsonSchemaObject {
  if (!schema) {
    return EMPTY_OBJECT_JSON_SCHEMA;
  }

  const normalized = normalizeObjectSchema(schema);
  if (!normalized) {
    return EMPTY_OBJECT_JSON_SCHEMA;
  }

  return toJsonSchemaCompat(normalized, {
    strictUnions: true,
    pipeStrategy: 'input',
  }) as JsonSchemaObject;
}

function listToolDefinitions(server: McpServer): McpToolDefinition[] {
  const { _registeredTools } = server as McpServer & McpServerWithTools;

  return (Object.entries(_registeredTools) as [string, RegisteredMcpTool][])
    .filter(([, tool]) => tool.enabled)
    .map(([name, tool]) => {
      const definition: McpToolDefinition = {
        name,
        title: tool.title,
        description: tool.description,
        inputSchema: toJsonSchema(tool.inputSchema),
      };

      if (tool.outputSchema) {
        const normalized = normalizeObjectSchema(tool.outputSchema);
        if (normalized) {
          definition.outputSchema = toJsonSchemaCompat(normalized, {
            strictUnions: true,
            pipeStrategy: 'output',
          }) as JsonSchemaObject;
        }
      }

      if (tool.annotations) {
        definition.annotations = tool.annotations;
      }

      return definition;
    });
}

export function buildMcpOpenApiDocument(
  server: McpServer,
  serverInfo: { name: string; version: string },
  basePath: string,
  serverUrl: string
): McpOpenApiDocument {
  const tools = listToolDefinitions(server);

  return {
    openapi: '3.1.0',
    info: {
      title: `${serverInfo.name} MCP`,
      version: serverInfo.version,
      description: `Model Context Protocol tools. Use POST ${basePath} for JSON-RPC (initialize, tools/list, tools/call).`,
    },
    servers: [{ url: serverUrl }],
    paths: {
      [basePath]: {
        post: {
          operationId: 'mcp_jsonrpc',
          summary: 'MCP Streamable HTTP transport',
          description:
            'JSON-RPC 2.0 endpoint. Send initialize, then tools/list or tools/call with Accept: application/json, text/event-stream.',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  description: 'JSON-RPC 2.0 request',
                },
              },
            },
          },
          responses: {
            '200': {
              description:
                'JSON-RPC response (application/json) or SSE stream (text/event-stream)',
            },
          },
        },
      },
    },
    'x-mcp-tools': tools,
  };
}
