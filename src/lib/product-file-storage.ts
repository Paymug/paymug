import "server-only";

import { getCloudflareContext } from "@opennextjs/cloudflare";
import { uid } from "./utils";
import type {
  ProductFile,
  ProductFileUploadKind,
} from "./product-files.types";

const maximumDescriptionImageSize = 5 * 1024 * 1024;
const maximumDeliveryFileSize = 25 * 1024 * 1024;

async function getProductFilesBucket() {
  const { env } = await getCloudflareContext({ async: true });
  if (!env.PRODUCT_FILES) {
    throw new Error("Product file storage is not configured");
  }
  return env.PRODUCT_FILES;
}

export async function storeProductFile(
  file: File,
  userId: string,
  kind: ProductFileUploadKind
) {
  const maximumSize =
    kind === "description"
      ? maximumDescriptionImageSize
      : maximumDeliveryFileSize;
  if (!file.size || file.size > maximumSize) {
    throw new Error(
      kind === "description"
        ? "Images must be 5 MB or smaller"
        : "Product files must be 25 MB or smaller"
    );
  }
  if (kind === "description" && !file.type.startsWith("image/")) {
    throw new Error("Choose an image file");
  }

  const id = uid();
  const storageKey = `${kind}/${userId}/${id}`;
  const bucket = await getProductFilesBucket();
  await bucket.put(storageKey, await file.arrayBuffer(), {
    httpMetadata: {
      contentType: file.type || "application/octet-stream",
    },
    customMetadata: {
      originalName: file.name,
      ownerId: userId,
    },
  });

  const storedFile: ProductFile = {
    id,
    name: file.name,
    size: file.size,
    type: file.type || "application/octet-stream",
    storageKey,
  };
  return storedFile;
}

export async function readStoredProductFile(storageKey: string) {
  const bucket = await getProductFilesBucket();
  return bucket.get(storageKey);
}
