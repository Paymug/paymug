import "server-only";

import packageJson from "../../package.json";
import { paymugBuildInfo } from "@/generated/paymug-build-info";
import { getRuntimeConfiguration } from "./runtime-env";
import type { AppAboutStatus } from "./app-about.types";

export async function getAppAboutStatus(): Promise<AppAboutStatus> {
  const runtime = await getRuntimeConfiguration();
  return {
    version: packageJson.version,
    commitSha: paymugBuildInfo.commitSha || undefined,
    upstreamSha: paymugBuildInfo.upstreamSha || undefined,
    repository: paymugBuildInfo.repository || undefined,
    configurations: [
      {
        id: "database",
        label: "DB binding",
        description: "Cloudflare D1 database used for application data.",
        configured: runtime.bindings.database,
        required: true,
      },
      {
        id: "storage",
        label: "PRODUCT_FILES binding",
        description: "Cloudflare R2 bucket used for product files.",
        configured: runtime.bindings.storage,
        required: true,
      },
      {
        id: "auth-secret",
        label: "AUTH_SECRET",
        description: "Securely signs merchant and customer sessions.",
        configured: Boolean(runtime.values.AUTH_SECRET),
        required: true,
      },
      {
        id: "encryption-secret",
        label: "ENCRYPTION_SECRET",
        description: "Encrypts payment and integration credentials.",
        configured: Boolean(runtime.values.ENCRYPTION_SECRET),
        required: true,
      },
      {
        id: "app-url",
        label: "NEXT_PUBLIC_APP_URL",
        description: "Public HTTPS origin used for callbacks and customer links.",
        configured: Boolean(runtime.values.NEXT_PUBLIC_APP_URL),
        required: true,
      },
      {
        id: "email-binding",
        label: "EMAIL binding",
        description: "Cloudflare Email binding for transactional messages.",
        configured: runtime.bindings.email,
        required: false,
      },
      {
        id: "email-from",
        label: "EMAIL_FROM",
        description: "Verified sender shown on transactional email.",
        configured: Boolean(runtime.values.EMAIL_FROM),
        required: false,
      },
      {
        id: "github-oauth",
        label: "GitHub OAuth credentials",
        description: "GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET for repository delivery.",
        configured: Boolean(
          runtime.values.GITHUB_CLIENT_ID &&
            runtime.values.GITHUB_CLIENT_SECRET,
        ),
        required: false,
      },
    ],
  };
}
