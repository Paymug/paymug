import { findOrderById, findProductById } from "@/lib/db";
import { getOrderLicense } from "@/lib/commerce-features";
import { getLicenseEntitlementSummary } from "@/lib/license-entitlements";
import { readStoredProductFile } from "@/lib/product-file-storage";
import { jsonError } from "@/lib/utils";

export async function GET(request: Request) {
  const searchParams = new URL(request.url).searchParams;
  const orderId = searchParams.get("orderId");
  const fileId = searchParams.get("fileId");
  if (!orderId || !fileId) return jsonError("Not found", 404);

  const order = await findOrderById(orderId);
  if (!order || order.status !== "paid") return jsonError("Not found", 404);
  const [product, license] = await Promise.all([
    findProductById(order.productId),
    getOrderLicense(order.userId, order.id),
  ]);
  const licenseEntitlement = license
    ? getLicenseEntitlementSummary(license)
    : undefined;
  const currentUpdatesIncluded = Boolean(
    licenseEntitlement?.perpetual && licenseEntitlement.updatesActive
  );
  const files = currentUpdatesIncluded
    ? [...(product?.productFiles || []), ...order.productFiles]
    : order.productFiles.length
      ? order.productFiles
      : product?.productFiles || [];
  const file = files.find((candidate) => candidate.id === fileId);
  if (
    !file ||
    !file.storageKey.startsWith(`delivery/${order.userId}/`)
  ) {
    return jsonError("Not found", 404);
  }

  const storedFile = await readStoredProductFile(file.storageKey);
  if (!storedFile) return jsonError("Not found", 404);
  const headers = new Headers();
  headers.set(
    "Content-Type",
    storedFile.httpMetadata?.contentType || file.type || "application/octet-stream"
  );
  headers.set(
    "Content-Disposition",
    `attachment; filename*=UTF-8''${encodeURIComponent(file.name)}`
  );
  headers.set("Cache-Control", "private, no-store");
  headers.set("X-Content-Type-Options", "nosniff");
  return new Response(storedFile.body, { headers });
}
