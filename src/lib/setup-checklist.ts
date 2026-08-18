import "server-only";

import { cache } from "react";
import {
  getGitHubConnection,
  getGitHubOAuthHostname,
  listOrdersByUser,
  listProductsByUser,
} from "./db";
import { getGitHubCallbackUrlForHostname } from "./github-hostname.utils";
import { getStoreById } from "./stores";
import { getPayPalCredentials, getStripeCredentials } from "./payment-credentials";
import { getPayPalWebhookStatus } from "./paypal-webhooks";
import { getRuntimeConfiguration } from "./runtime-env";
import type {
  SetupChecklist,
  SetupChecklistGroup,
} from "./setup-checklist.types";
import type { PayPalMode } from "./types";

function isPublicAppUrl(value?: string) {
  if (!value) return false;
  try {
    const url = new URL(value);
    return (
      url.protocol === "https:" &&
      !["localhost", "127.0.0.1", "::1"].includes(url.hostname)
    );
  } catch {
    return false;
  }
}

export const getSetupChecklist = cache(
  async (
    userId: string,
    storeName: string,
    storeSlug: string,
    requestOrigin?: string,
    storeId?: string,
    environment?: PayPalMode
  ): Promise<SetupChecklist> => {
    const [
      paypalSandbox,
      paypalLive,
      stripeSandbox,
      stripeLive,
      github,
      products,
      orders,
      runtime,
      savedGitHubHostname,
      activeStore,
    ] =
      await Promise.all([
        getPayPalCredentials(userId, "sandbox", storeId),
        getPayPalCredentials(userId, "live", storeId),
        getStripeCredentials(userId, "sandbox", storeId),
        getStripeCredentials(userId, "live", storeId),
        getGitHubConnection(userId, storeId),
        listProductsByUser(userId, storeId, environment),
        listOrdersByUser(userId, storeId, environment),
        getRuntimeConfiguration(),
        getGitHubOAuthHostname(userId),
        storeId ? getStoreById(storeId, userId) : undefined,
      ]);
    const publishedProducts = products.filter(
      (product) => product.status === "published"
    );
    const selectedProvider = activeStore?.paymentGateway || "paypal";
    const sandboxConnection =
      selectedProvider === "stripe" ? stripeSandbox : paypalSandbox;
    const liveConnection =
      selectedProvider === "stripe" ? stripeLive : paypalLive;
    const [sandboxPayPalWebhook, livePayPalWebhook] = await Promise.all([
      selectedProvider === "stripe"
        ? Promise.resolve("not_configured" as const)
        : getPayPalWebhookStatus({ userId, mode: "sandbox" }),
      selectedProvider === "stripe"
        ? Promise.resolve("not_configured" as const)
        : getPayPalWebhookStatus({ userId, mode: "live" }),
    ]);
    const sandboxWebhookReady =
      selectedProvider === "stripe"
        ? Boolean(stripeSandbox?.webhookSecret)
        : sandboxPayPalWebhook === "active";
    const liveWebhookReady =
      selectedProvider === "stripe"
        ? Boolean(stripeLive?.webhookSecret)
        : livePayPalWebhook === "active";
    const sandboxPaidOrder = orders.some(
      (order) =>
        order.environment === "sandbox" && order.status === "paid"
    );
    const appUrl = runtime.values.NEXT_PUBLIC_APP_URL;
    const githubRequestOrigin =
      requestOrigin || "http://localhost:3000";
    const githubHostname =
      savedGitHubHostname || new URL(githubRequestOrigin).host;
    const githubCallbackUrl = getGitHubCallbackUrlForHostname(
      githubHostname,
      githubRequestOrigin
    );
    const publicUrlConfigured = isPublicAppUrl(appUrl);
    const githubOAuthConfigured = Boolean(
      runtime.values.GITHUB_CLIENT_ID &&
        runtime.values.GITHUB_CLIENT_SECRET
    );
    const platformChecks = [
      {
        id: "database-binding",
        label: "DB binding",
        description:
          "Connects the app to the Cloudflare D1 database used for store data.",
        complete: runtime.bindings.database,
      },
      {
        id: "auth-secret",
        label: "AUTH_SECRET",
        description:
          "Signs login sessions and must be a secure, production-only secret.",
        complete: Boolean(runtime.values.AUTH_SECRET),
      },
      {
        id: "encryption-secret",
        label: "ENCRYPTION_SECRET",
        description:
          "Encrypts sensitive credentials such as payment and GitHub tokens.",
        complete: Boolean(runtime.values.ENCRYPTION_SECRET),
      },
      {
        id: "public-url",
        label: "NEXT_PUBLIC_APP_URL",
        description:
          "The public HTTPS address customers and external services use to reach the app.",
        complete: publicUrlConfigured,
      },
    ];
    const emailChecks = [
      {
        id: "email-binding",
        label: "EMAIL binding",
        description:
          "Connects the app to Cloudflare Email for transactional delivery.",
        complete: runtime.bindings.email,
      },
      {
        id: "email-from",
        label: "EMAIL_FROM",
        description:
          "The verified Paymug sender address shown on outgoing emails.",
        complete: Boolean(runtime.values.EMAIL_FROM),
      },
    ];
    const githubChecks = [
      {
        id: "github-client-id",
        label: "GITHUB_CLIENT_ID",
        description:
          "Identifies the GitHub OAuth App used to authorize repository access.",
        complete: Boolean(runtime.values.GITHUB_CLIENT_ID),
      },
      {
        id: "github-client-secret",
        label: "GITHUB_CLIENT_SECRET",
        description:
          "Authenticates the GitHub OAuth App when exchanging authorization codes.",
        complete: Boolean(runtime.values.GITHUB_CLIENT_SECRET),
      },
      {
        id: "github-account",
        label: "GitHub account authorized",
        description:
          "Connect the account that owns or administers the private repositories.",
        complete: Boolean(github),
      },
    ];

    const groups: SetupChecklistGroup[] = [
      {
        id: "store",
        title: "Store",
        description: "Complete the customer-facing parts of your store.",
        items: [
          {
            id: "store-profile",
            title: "Complete your store profile",
            description:
              "Confirm the store name, owner name, email, and public store URL.",
            complete: Boolean(storeName.trim() && storeSlug.trim()),
            required: true,
            actionLabel: "Review settings",
            href: "/dashboard/settings/store",
          },
          {
            id: "first-product",
            title: "Create your first product",
            description:
              "Add pricing, delivery content, and optional license generation.",
            complete: products.length > 0,
            required: true,
            actionLabel: "Create product",
            href: "/dashboard/products/new",
          },
          {
            id: "publish-product",
            title: "Publish a product",
            description:
              "At least one published product is required before customers can buy.",
            complete: publishedProducts.length > 0,
            required: true,
            actionLabel: "Manage products",
            href: "/dashboard/products",
          },
        ],
      },
      {
        id: "payments",
        title: "Live payments",
        description:
          "Connect a live payment gateway for customer purchases.",
        items: [
          {
            id: "live-payment-gateway",
            title: "Connect live payment credentials",
            description:
              "Connect a live PayPal application or Stripe secret key.",
            complete: Boolean(liveConnection),
            required: true,
            actionLabel: "Configure payments",
            href: "/dashboard/settings/payments?mode=live",
          },
          {
            id: "live-webhook",
            title: "Activate the live payment webhook",
            description:
              "Ensures completed payments and subscription status changes are processed reliably.",
            complete: liveWebhookReady,
            required: Boolean(liveConnection),
            actionLabel: "Set up webhook",
            href: "/dashboard/settings/payments?mode=live",
          },
        ],
      },
      {
        id: "testing",
        title: "Sandbox testing",
        description:
          "Recommended checks before accepting a real customer payment.",
        items: [
          {
            id: "sandbox-payment-gateway",
            title: "Connect sandbox payment credentials",
            description:
              "Use PayPal sandbox credentials or a Stripe test key to test checkout safely.",
            complete: Boolean(sandboxConnection),
            required: false,
            actionLabel: "Connect sandbox",
            href: "/dashboard/settings/payments?mode=sandbox",
          },
          {
            id: "sandbox-webhook",
            title: "Activate the sandbox payment webhook",
            description:
              "Confirm subscription renewals and status changes work during testing.",
            complete: sandboxWebhookReady,
            required: false,
            actionLabel: "Set up webhook",
            href: "/dashboard/settings/payments?mode=sandbox",
          },
          {
            id: "test-purchase",
            title: "Complete a sandbox purchase",
            description:
              "Verify checkout, delivery content, licenses, notifications, and receipt emails.",
            complete: sandboxPaidOrder,
            required: false,
            actionLabel: "Open storefront",
            href: "/",
            external: true,
          },
        ],
      },
      {
        id: "platform",
        title: "Platform and email",
        description:
          "Deployment settings required for secure production operation.",
        items: [
          {
            id: "platform-runtime",
            title: "Platform runtime",
            description:
              "Database, security secrets, and the public application URL must all be configured.",
            complete: platformChecks.every((check) => check.complete),
            required: true,
            actionLabel: "Open Cloudflare",
            href: "https://dash.cloudflare.com/",
            external: true,
            checks: platformChecks,
          },
          {
            id: "email-configuration",
            title: "Email delivery",
            description:
              "Cloudflare Email Service and a sender address must be configured. Reply-to is optional and defaults to the sender.",
            complete: emailChecks.every((check) => check.complete),
            required: true,
            actionLabel: "Configure email",
            href: "https://dash.cloudflare.com/",
            external: true,
            checks: emailChecks,
          },
          {
            id: "github-configuration",
            title: "GitHub repository delivery",
            description: `Configure the OAuth variables and authorize the repository owner account. OAuth callback: ${githubCallbackUrl}`,
            complete: githubChecks.every((check) => check.complete),
            required: false,
            actionLabel: githubOAuthConfigured
              ? "Authorize GitHub"
              : "Review GitHub setup",
            href: githubOAuthConfigured
              ? "/dashboard/settings/github"
              : "https://github.com/settings/developers",
            external: !githubOAuthConfigured,
            checks: githubChecks,
          },
        ],
      },
    ];
    const requiredItems = groups
      .flatMap((group) => group.items)
      .filter((item) => item.required);
    const completedRequired = requiredItems.filter(
      (item) => item.complete
    ).length;

    return {
      groups,
      completedRequired,
      totalRequired: requiredItems.length,
      progress: Math.round(
        (completedRequired / Math.max(requiredItems.length, 1)) * 100
      ),
    };
  }
);
