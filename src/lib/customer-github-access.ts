import "server-only";

import {
  findOrderById,
  findProductById,
  updateOrder,
} from "./db";
import { listFeatureRecords } from "./feature-records";
import {
  grantGitHubOrderAccess,
  revokeGitHubOrderAccess,
} from "./github-access";
import { resolveGitHubBuyerIdentity } from "./github-products";
import { hasActiveLicenseUpdates } from "./license-entitlements";
import type { FeatureRecord } from "./feature-records.types";
import type { CustomerGitHubAccessResult } from "./customer-github-access.types";
import type { Order, Product } from "./types";

function findOrderLicense(
  licenses: FeatureRecord[],
  order: Order,
): FeatureRecord | undefined {
  return licenses.find(
    (license) =>
      license.data.orderId === order.id ||
      (license.data.subscriptionLicense === true &&
        license.data.productId === order.productId &&
        String(license.subtitle || "").toLowerCase() ===
          order.customerEmail.toLowerCase()),
  );
}

function getOrderAccessProduct(order: Order, product: Product): Product {
  return {
    ...product,
    githubRepoOwner: order.githubRepoOwner || product.githubRepoOwner,
    githubRepoName: order.githubRepoName || product.githubRepoName,
  };
}

async function getAuthorizedCustomerGitHubOrder(
  orderId: string,
  customerEmail: string,
  requireActiveEntitlement: boolean,
): Promise<{ order: Order; product: Product }> {
  const order = await findOrderById(orderId);
  if (
    !order ||
    order.environment !== "live" ||
    order.customerEmail.trim().toLowerCase() !==
      customerEmail.trim().toLowerCase()
  ) {
    throw new Error("Purchase not found");
  }
  if (requireActiveEntitlement && order.status !== "paid") {
    throw new Error("Repository access is only available for paid purchases");
  }
  const product = await findProductById(order.productId);
  if (!product) throw new Error("Product is no longer available");
  const accessProduct = getOrderAccessProduct(order, product);
  if (!accessProduct.githubRepoOwner || !accessProduct.githubRepoName) {
    throw new Error("This purchase does not include a private repository");
  }
  if (requireActiveEntitlement && product.generateLicense) {
    const licenses = await listFeatureRecords(
      order.userId,
      "licenses",
      order.environment,
    );
    const license = findOrderLicense(licenses, order);
    if (!license || !hasActiveLicenseUpdates(license)) {
      throw new Error(
        "Repository updates are no longer included with this purchase",
      );
    }
  }
  return { order, product: accessProduct };
}

function toCustomerGitHubAccessResult(order: Order): CustomerGitHubAccessResult {
  return {
    username: order.githubUsername,
    status: order.githubAccessStatus,
    error: order.githubAccessError,
  };
}

export async function inviteCustomerGitHubAccess(
  orderId: string,
  customerEmail: string,
  identity: string,
): Promise<CustomerGitHubAccessResult> {
  const { order, product } = await getAuthorizedCustomerGitHubOrder(
    orderId,
    customerEmail,
    true,
  );
  if (
    order.githubUsername &&
    !["revoked", "not_required"].includes(order.githubAccessStatus)
  ) {
    throw new Error(
      "Revoke the current GitHub recipient before inviting another account",
    );
  }
  const username = await resolveGitHubBuyerIdentity(
    order.userId,
    order.storeId,
    identity,
  );
  const pendingOrder =
    (await updateOrder(order.id, {
      githubUsername: username,
      githubAccessStatus: "pending",
      githubAccessManaged: false,
      githubInvitationId: "",
      githubAccessError: "",
      githubAccessGrantedAt: "",
      githubAccessRevokedAt: "",
    })) || order;
  await grantGitHubOrderAccess(pendingOrder, product);
  const updatedOrder = await findOrderById(order.id);
  return toCustomerGitHubAccessResult(updatedOrder || pendingOrder);
}

export async function revokeCustomerGitHubAccess(
  orderId: string,
  customerEmail: string,
): Promise<CustomerGitHubAccessResult> {
  const { order, product } = await getAuthorizedCustomerGitHubOrder(
    orderId,
    customerEmail,
    false,
  );
  if (order.githubUsername) {
    await revokeGitHubOrderAccess(order, product);
    const revokedOrder = await findOrderById(order.id);
    if (revokedOrder?.githubAccessStatus === "error") {
      return toCustomerGitHubAccessResult(revokedOrder);
    }
  }
  const updatedOrder = await updateOrder(order.id, {
    githubUsername: "",
    githubAccessStatus: "revoked",
    githubAccessManaged: false,
    githubInvitationId: "",
    githubAccessError: "",
    githubAccessRevokedAt: new Date().toISOString(),
  });
  return toCustomerGitHubAccessResult(updatedOrder || order);
}
