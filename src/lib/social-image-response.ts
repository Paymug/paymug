import "server-only";

import { readStoredProductFile } from "./product-file-storage";

const fallbackSocialImagePath = "/og.png";
const inlineImagePattern =
  /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=\s]+)$/;

function createImageHeaders(contentType: string, immutable = false): Headers {
  const headers = new Headers();
  headers.set("Content-Type", contentType);
  headers.set(
    "Cache-Control",
    immutable
      ? "public, max-age=31536000, immutable"
      : "public, max-age=300, stale-while-revalidate=86400",
  );
  headers.set("X-Content-Type-Options", "nosniff");
  return headers;
}

function createInlineImageResponse(source: string): Response | undefined {
  const match = inlineImagePattern.exec(source);
  if (!match) return undefined;
  try {
    const binary = atob(match[2].replace(/\s+/g, ""));
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) {
      bytes[index] = binary.charCodeAt(index);
    }
    return new Response(bytes.buffer, {
      headers: createImageHeaders(match[1]),
    });
  } catch {
    return undefined;
  }
}

async function createStoredProductImageResponse(
  imageUrl: URL,
): Promise<Response | undefined> {
  if (imageUrl.pathname !== "/api/product-files/image") return undefined;
  const storageKey = imageUrl.searchParams.get("key");
  if (!storageKey?.startsWith("description/")) return undefined;
  const image = await readStoredProductFile(storageKey);
  if (!image) return undefined;
  return new Response(image.body, {
    headers: createImageHeaders(
      image.httpMetadata?.contentType || "application/octet-stream",
      true,
    ),
  });
}

export async function createSocialImageResponse(
  source: string | undefined,
  requestUrl: string,
): Promise<Response> {
  if (source) {
    const inlineResponse = createInlineImageResponse(source);
    if (inlineResponse) return inlineResponse;

    try {
      const imageUrl = new URL(source, requestUrl);
      if (imageUrl.protocol === "http:" || imageUrl.protocol === "https:") {
        const storedImageResponse = await createStoredProductImageResponse(
          imageUrl,
        );
        if (storedImageResponse) return storedImageResponse;
        return Response.redirect(imageUrl, 307);
      }
    } catch {
      // Invalid legacy image values use the Paymug fallback below.
    }
  }

  return Response.redirect(new URL(fallbackSocialImagePath, requestUrl), 307);
}
