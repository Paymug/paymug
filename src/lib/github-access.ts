import "server-only";

import { decryptSecret } from "./crypto";
import {
  findOrderById,
  findProductById,
  getGitHubConnection,
  listOrdersByUser,
  updateOrder,
} from "./db";
import {
  listFeatureRecords,
  updateFeatureRecord,
} from "./feature-records";
import {
  addGitHubRepositoryCollaborator,
  deleteGitHubRepositoryInvitation,
  removeGitHubRepositoryCollaborator,
} from "./github-api";
import type {
  GitHubAccessTarget,
  GitHubRevokeOptions,
} from "./github.types";
import type { FeatureRecord } from "./feature-records.types";
import type { Order, Product } from "./types";
import {
  getLicenseEntitlementSummary,
  hasActiveLicenseUpdates,
} from "./license-entitlements";
import { hasProFeature } from "./app-license";

function hasGitHubDelivery(product?: Product): product is Product & {
  githubRepoOwner: string;
  githubRepoName: string;
} {
  return Boolean(product?.githubRepoOwner && product.githubRepoName);
}

function matchesTarget(
  target: GitHubAccessTarget,
  username: string,
  owner: string,
  repository: string
): boolean {
  return (
    target.order.githubUsername?.toLowerCase() === username.toLowerCase() &&
    target.product.githubRepoOwner?.toLowerCase() === owner.toLowerCase() &&
    target.product.githubRepoName?.toLowerCase() === repository.toLowerCase()
  );
}

async function getGitHubAccessTargets(userId: string): Promise<GitHubAccessTarget[]> {
  const orders = await listOrdersByUser(userId);
  const targets = await Promise.all(
    orders.map(async (order): Promise<GitHubAccessTarget | undefined> => {
      const product = await findProductById(order.productId);
      return product
        ? {
            order,
            product: {
              ...product,
              githubRepoOwner:
                order.githubRepoOwner || product.githubRepoOwner,
              githubRepoName: order.githubRepoName || product.githubRepoName,
            },
          }
        : undefined;
    })
  );
  return targets.filter(
    (target): target is GitHubAccessTarget => Boolean(target)
  );
}

function findOrderLicense(
  licenses: FeatureRecord[],
  orderId: string
): FeatureRecord | undefined {
  return licenses.find((license) => license.data.orderId === orderId);
}

function hasValidEntitlement(
  target: GitHubAccessTarget,
  licenses: FeatureRecord[],
  excludedOrderId: string,
  options?: GitHubRevokeOptions
): boolean {
  if (options?.force) return false;
  if (
    target.order.id === excludedOrderId ||
    target.order.status !== "paid" ||
    options?.excludeProductId === target.product.id
  ) {
    return false;
  }
  if (!target.product.generateLicense) return true;
  const license = findOrderLicense(licenses, target.order.id);
  return Boolean(license && hasActiveLicenseUpdates(license));
}

async function markGitHubAccessRevoked(order: Order): Promise<void> {
  await updateOrder(order.id, {
    githubAccessStatus: "revoked",
    githubInvitationId: "",
    githubAccessError: "",
    githubAccessRevokedAt: new Date().toISOString(),
  });
}

export async function grantGitHubOrderAccess(
  order: Order,
  product?: Product
): Promise<void> {
  if (!hasGitHubDelivery(product) || !order.githubUsername) return;
  if (!(await hasProFeature("private_github"))) return;

  const connection = await getGitHubConnection(
    order.userId,
    order.storeId
  );
  if (!connection) {
    await updateOrder(order.id, {
      githubAccessStatus: "error",
      githubAccessError:
        "The seller must reconnect GitHub before repository access can be granted.",
    });
    return;
  }

  try {
    const accessToken = await decryptSecret(connection.accessTokenEncrypted);
    const invitation = await addGitHubRepositoryCollaborator(
      accessToken,
      product.githubRepoOwner,
      product.githubRepoName,
      order.githubUsername
    );
    const targets = await getGitHubAccessTargets(order.userId);
    const previouslyManaged = targets.some(
      (target) =>
        target.order.githubAccessManaged &&
        matchesTarget(
          target,
          order.githubUsername!,
          product.githubRepoOwner,
          product.githubRepoName
        )
    );

    await updateOrder(order.id, {
      githubAccessStatus: invitation.alreadyHadAccess
        ? "existing"
        : "invited",
      githubAccessManaged:
        !invitation.alreadyHadAccess || previouslyManaged,
      githubInvitationId: invitation.invitationId || "",
      githubAccessError: "",
      githubAccessGrantedAt: new Date().toISOString(),
      githubAccessRevokedAt: "",
    });
  } catch (error) {
    await updateOrder(order.id, {
      githubAccessStatus: "error",
      githubAccessError:
        error instanceof Error
          ? error.message
          : "Could not grant GitHub repository access",
    });
  }
}

export async function revokeGitHubOrderAccess(
  order: Order,
  product?: Product,
  options?: GitHubRevokeOptions
): Promise<void> {
  if (!hasGitHubDelivery(product) || !order.githubUsername) return;

  const [targets, licenses] = await Promise.all([
    getGitHubAccessTargets(order.userId),
    listFeatureRecords(order.userId, "licenses"),
  ]);
  const relatedTargets = targets.filter((target) =>
    matchesTarget(
      target,
      order.githubUsername!,
      product.githubRepoOwner,
      product.githubRepoName
    )
  );
  const anotherEntitlementIsValid = relatedTargets.some(
    (target) =>
      hasValidEntitlement(target, licenses, order.id, options)
  );
  if (anotherEntitlementIsValid) {
    await markGitHubAccessRevoked(order);
    return;
  }

  const managedByPaymug = relatedTargets.some(
    (target) => target.order.githubAccessManaged
  );
  if (!managedByPaymug) {
    await markGitHubAccessRevoked(order);
    return;
  }

  const connection = await getGitHubConnection(
    order.userId,
    order.storeId
  );
  if (!connection) {
    await updateOrder(order.id, {
      githubAccessStatus: "error",
      githubAccessError:
        "GitHub is disconnected, so repository access could not be removed.",
    });
    return;
  }

  try {
    const accessToken = await decryptSecret(connection.accessTokenEncrypted);
    const invitationIds = new Set(
      relatedTargets
        .map((target) => target.order.githubInvitationId)
        .filter((value): value is string => Boolean(value))
    );
    await Promise.all(
      [...invitationIds].map((invitationId) =>
        deleteGitHubRepositoryInvitation(
          accessToken,
          product.githubRepoOwner,
          product.githubRepoName,
          invitationId
        )
      )
    );
    await removeGitHubRepositoryCollaborator(
      accessToken,
      product.githubRepoOwner,
      product.githubRepoName,
      order.githubUsername
    );
    await markGitHubAccessRevoked(order);
  } catch (error) {
    await updateOrder(order.id, {
      githubAccessStatus: "error",
      githubAccessError:
        error instanceof Error
          ? error.message
          : "Could not revoke GitHub repository access",
    });
  }
}

export async function syncGitHubAccessForLicense(
  license: FeatureRecord,
  active: boolean
): Promise<void> {
  const orderId = String(license.data.orderId || "");
  if (!orderId) return;
  const order = await findOrderById(orderId);
  if (!order) return;
  const product = await findProductById(order.productId);
  if (active && order.status === "paid") {
    await grantGitHubOrderAccess(order, product);
  } else {
    await revokeGitHubOrderAccess(order, product);
  }
  const updatedOrder = await findOrderById(order.id);
  if (updatedOrder?.githubAccessStatus === "error") {
    throw new Error(
      updatedOrder.githubAccessError ||
        "Could not update GitHub repository access"
    );
  }
}

export async function revokeProductGitHubAccess(
  product: Product
): Promise<void> {
  if (!hasGitHubDelivery(product)) return;
  const orders = (await listOrdersByUser(product.userId)).filter(
    (order) =>
      order.productId === product.id &&
      order.githubUsername &&
      order.githubAccessStatus !== "revoked"
  );
  for (const order of orders) {
    await revokeGitHubOrderAccess(order, product, {
      excludeProductId: product.id,
    });
    const updatedOrder = await findOrderById(order.id);
    if (updatedOrder?.githubAccessStatus === "error") {
      throw new Error(
        updatedOrder.githubAccessError ||
          "Could not revoke GitHub repository access"
      );
    }
  }
}

export async function revokeAllGitHubAccess(userId: string): Promise<void> {
  const targets = await getGitHubAccessTargets(userId);
  const managedTargets = targets.filter(
    (target) =>
      target.order.githubAccessManaged &&
      target.order.githubUsername &&
      hasGitHubDelivery(target.product) &&
      target.order.githubAccessStatus !== "revoked"
  );
  for (const target of managedTargets) {
    await revokeGitHubOrderAccess(target.order, target.product, { force: true });
    const updatedOrder = await findOrderById(target.order.id);
    if (updatedOrder?.githubAccessStatus === "error") {
      throw new Error(
        updatedOrder.githubAccessError ||
          "Could not revoke GitHub repository access"
      );
    }
  }
}

export async function reconcileExpiredGitHubLicenses(
  userId: string
): Promise<void> {
  const licenses = await listFeatureRecords(userId, "licenses");
  const expiredStandardLicenses = licenses.filter((license) => {
    if (getLicenseEntitlementSummary(license).perpetual) return false;
    const expiresAt = String(license.data.expiresAt || "");
    return (
      (license.status === "active" || license.status === "expired") &&
      Boolean(expiresAt) &&
      new Date(expiresAt) <= new Date()
    );
  });
  const expiredPerpetualUpdates = licenses.filter((license) => {
    const entitlement = getLicenseEntitlementSummary(license);
    return (
      license.status === "active" &&
      entitlement.perpetual &&
      !entitlement.updatesActive &&
      license.data.updatesStatus !== "expired"
    );
  });

  for (const license of expiredStandardLicenses) {
    const updated =
      license.status === "expired"
        ? license
        : (await updateFeatureRecord(license.id, userId, {
            status: "expired",
          })) || license;
    try {
      await syncGitHubAccessForLicense(updated, false);
    } catch (error) {
      console.error("GitHub access reconciliation failed", error);
    }
  }

  for (const license of expiredPerpetualUpdates) {
    try {
      await syncGitHubAccessForLicense(license, false);
      await updateFeatureRecord(license.id, userId, {
        data: {
          ...license.data,
          updatesStatus: "expired",
          updatesExpiredAt: new Date().toISOString(),
        },
      });
    } catch (error) {
      console.error("GitHub update access reconciliation failed", error);
    }
  }
}
