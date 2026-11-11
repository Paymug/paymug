import { authenticateApiKey } from "@/lib/api-keys";
import { handleMcpMessage } from "@/lib/mcp-server";

const unauthorized = () =>
  Response.json(
    { error: "Invalid or expired API key" },
    { status: 401, headers: { "WWW-Authenticate": 'Bearer realm="paymug-mcp"' } }
  );

/** MCP over Streamable HTTP (stateless, JSON responses only). */
export async function POST(req: Request) {
  const apiKey = await authenticateApiKey(req);
  if (!apiKey) return unauthorized();

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json(
      { jsonrpc: "2.0", id: null, error: { code: -32700, message: "Parse error" } },
      { status: 400 }
    );
  }

  const origin = new URL(req.url).origin;
  const messages = Array.isArray(body) ? body : [body];
  const responses = (
    await Promise.all(
      messages.map((message) => handleMcpMessage(message, apiKey, origin))
    )
  ).filter((response) => response !== undefined);

  if (responses.length === 0) return new Response(null, { status: 202 });
  return Response.json(Array.isArray(body) ? responses : responses[0]);
}

export function GET() {
  return new Response(null, { status: 405, headers: { Allow: "POST" } });
}

export function DELETE() {
  return new Response(null, { status: 405, headers: { Allow: "POST" } });
}
