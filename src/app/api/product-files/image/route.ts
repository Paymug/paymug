import { readStoredProductFile } from "@/lib/product-file-storage";
import { jsonError } from "@/lib/utils";

export async function GET(request: Request) {
  const storageKey = new URL(request.url).searchParams.get("key");
  if (!storageKey?.startsWith("description/")) {
    return jsonError("Not found", 404);
  }

  const image = await readStoredProductFile(storageKey);
  if (!image) return jsonError("Not found", 404);
  const headers = new Headers();
  headers.set(
    "Content-Type",
    image.httpMetadata?.contentType || "application/octet-stream"
  );
  headers.set("Cache-Control", "public, max-age=31536000, immutable");
  headers.set("X-Content-Type-Options", "nosniff");
  return new Response(image.body, { headers });
}
