import "server-only";

import { z } from "zod";
import { runAsApiKeyUser } from "./auth";
import type { ApiKeyRecord } from "./feature-records.types";
import { allowedResources, mcpTools } from "./mcp-tools";

const supportedProtocolVersions = ["2025-06-18", "2025-03-26", "2024-11-05"];

interface JsonRpcRequest {
  jsonrpc: "2.0";
  id?: string | number | null;
  method: string;
  params?: Record<string, unknown>;
}

type JsonRpcResponse =
  | { jsonrpc: "2.0"; id: string | number | null; result: unknown }
  | {
      jsonrpc: "2.0";
      id: string | number | null;
      error: { code: number; message: string };
    };

const rpcError = (
  id: JsonRpcRequest["id"],
  code: number,
  message: string
): JsonRpcResponse => ({ jsonrpc: "2.0", id: id ?? null, error: { code, message } });

function toolText(value: unknown, isError = false) {
  return {
    content: [
      {
        type: "text",
        text: typeof value === "string" ? value : JSON.stringify(value, null, 2),
      },
    ],
    isError,
  };
}

function listTools(apiKey: ApiKeyRecord) {
  return mcpTools.flatMap((tool) => {
    const allowed = allowedResources(tool, apiKey.scopes);
    if (allowed.length === 0) return [];
    return [
      {
        name: tool.name,
        description: tool.description,
        inputSchema: z.toJSONSchema(tool.input(allowed), { io: "input" }),
      },
    ];
  });
}

async function callTool(
  apiKey: ApiKeyRecord,
  origin: string,
  params: JsonRpcRequest["params"]
) {
  const tool = mcpTools.find((candidate) => candidate.name === params?.name);
  const allowed = tool ? allowedResources(tool, apiKey.scopes) : [];
  // Unknown and not-permitted tools look identical.
  if (!tool || allowed.length === 0) return undefined;

  const parsed = tool
    .input(allowed)
    .safeParse(params?.arguments ?? {});
  if (!parsed.success) {
    return toolText(
      `Invalid arguments: ${parsed.error.issues[0]?.message ?? "invalid input"}`,
      true
    );
  }
  try {
    const result = await runAsApiKeyUser(apiKey.userId, () =>
      tool.run(parsed.data as Record<string, unknown>, {
        scopes: apiKey.scopes,
        origin,
      }, allowed)
    );
    return toolText(result.body, !result.ok);
  } catch (error) {
    return toolText(
      error instanceof Error ? error.message : "Tool failed",
      true
    );
  }
}

/** Handles one JSON-RPC message. Returns undefined for notifications. */
export async function handleMcpMessage(
  message: unknown,
  apiKey: ApiKeyRecord,
  origin: string
): Promise<JsonRpcResponse | undefined> {
  const request = message as Partial<JsonRpcRequest> | null;
  if (!request || request.jsonrpc !== "2.0" || typeof request.method !== "string") {
    return rpcError(request?.id, -32600, "Invalid request");
  }
  const isNotification = request.id === undefined;

  switch (request.method) {
    case "initialize": {
      const requested = String(request.params?.protocolVersion ?? "");
      return {
        jsonrpc: "2.0",
        id: request.id ?? null,
        result: {
          protocolVersion: supportedProtocolVersions.includes(requested)
            ? requested
            : supportedProtocolVersions[0],
          capabilities: { tools: { listChanged: false } },
          serverInfo: { name: "paymug", version: "1.0.0" },
          instructions:
            "Manage a Paymug store. Tools shown are limited by this API key's permissions.",
        },
      };
    }
    case "ping":
      return { jsonrpc: "2.0", id: request.id ?? null, result: {} };
    case "tools/list":
      return {
        jsonrpc: "2.0",
        id: request.id ?? null,
        result: { tools: listTools(apiKey) },
      };
    case "tools/call": {
      const result = await callTool(apiKey, origin, request.params);
      return result
        ? { jsonrpc: "2.0", id: request.id ?? null, result }
        : rpcError(request.id, -32602, "Unknown tool");
    }
    default:
      return isNotification
        ? undefined
        : rpcError(request.id, -32601, "Method not found");
  }
}
