import { headers } from "next/headers";
import { Alert, Button } from "@/components/ui";
import {
  dashboardCardClass,
  dashboardPageClass,
  dashboardPageCopyClass,
} from "@/components/dashboard/dashboard.styles";
import { getSessionUser } from "@/lib/auth";
import {
  getGitHubConnection,
  getGitHubOAuthHostname,
} from "@/lib/db";
import { getRequestOrigin } from "@/lib/request-origin.utils";
import { getRuntimeEnvValue } from "@/lib/runtime-env";
import { GitHubCallbackSettingsForm } from "./GitHubCallbackSettingsForm";
import type { GitHubSettingsPageProps } from "./page.types";
import {
  getGitHubOAuthConfigStatus,
  getGitHubOAuthErrorMessage,
} from "./github-settings.utils";

export default async function GitHubSettingsPage({
  searchParams,
}: GitHubSettingsPageProps) {
  const user = await getSessionUser();
  if (!user) return null;
  const [
    connection,
    query,
    requestHeaders,
    oauthConfig,
    savedHostname,
    configuredAppUrl,
  ] = await Promise.all([
      getGitHubConnection(user.id, user.activeStoreId),
      searchParams,
      headers(),
      getGitHubOAuthConfigStatus(),
      getGitHubOAuthHostname(user.id),
      getRuntimeEnvValue("NEXT_PUBLIC_APP_URL"),
    ]);
  const requestUrl =
    configuredAppUrl ||
    getRequestOrigin(requestHeaders) ||
    "http://localhost:3000";
  const currentHostname = new URL(requestUrl).host;

  return (
    <div className={`${dashboardPageClass} !max-w-3xl`}>
      <h1 className="sr-only">GitHub</h1>
      <p className={dashboardPageCopyClass}>
        Connect the GitHub account that owns or administers private
        repositories you want to sell.
      </p>

      <section className={`${dashboardCardClass} mt-6 p-6 sm:p-8`}>
        {query.connected && (
          <Alert variant="success">GitHub account connected.</Alert>
        )}
        {query.disconnected && (
          <Alert variant="success">
            GitHub disconnected and managed repository access was removed.
          </Alert>
        )}
        {query.error && (
          <Alert>{getGitHubOAuthErrorMessage(query.error)}</Alert>
        )}
        {!oauthConfig.ready && (
          <Alert>
            Configure the missing GitHub OAuth environment variables before
            authorizing an account.
          </Alert>
        )}

        <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold">GitHub repository delivery</h2>
            <p className="mt-1 max-w-xl text-sm text-muted">
              Paymug requests repository access so it can list private
              repositories, invite paid customers with read access, and remove
              that access when their purchase or license becomes invalid.
            </p>
          </div>
          <span
            className={`rounded-full px-3 py-1 text-sm font-medium ${
              connection
                ? "bg-emerald-50 text-emerald-700"
                : "bg-zinc-100 text-zinc-600"
            }`}
          >
            {connection ? "Connected" : "Not connected"}
          </span>
        </div>

        <div className="mt-6 rounded-xl border border-border bg-background p-4">
          <p className="text-sm font-medium text-foreground">
            OAuth environment
          </p>
          <div className="mt-3 divide-y divide-border rounded-lg border border-border bg-white">
            {[
              {
                name: "GITHUB_CLIENT_ID",
                configured: oauthConfig.clientIdConfigured,
              },
              {
                name: "GITHUB_CLIENT_SECRET",
                configured: oauthConfig.clientSecretConfigured,
              },
              {
                name: "ENCRYPTION_SECRET",
                configured: oauthConfig.encryptionConfigured,
              },
            ].map((variable) => (
              <div
                key={variable.name}
                className="flex items-center justify-between gap-4 px-3 py-2 text-sm"
              >
                <code>{variable.name}</code>
                <span
                  className={
                    variable.configured
                      ? "font-medium text-emerald-700"
                      : "font-medium text-amber-700"
                  }
                >
                  {variable.configured ? "Configured" : "Missing"}
                </span>
              </div>
            ))}
          </div>

          <GitHubCallbackSettingsForm
            initialHostname={savedHostname || currentHostname}
            requestUrl={requestUrl}
          />
        </div>

        {connection ? (
          <div className="mt-6 space-y-4">
            <div className="rounded-xl border border-border bg-background p-4 text-sm">
              <p>
                Connected as{" "}
                <strong className="text-foreground">
                  @{connection.login}
                </strong>
              </p>
              <p className="mt-1 text-muted">
                Connected {new Date(connection.connectedAt).toLocaleString()}
              </p>
            </div>
            <p className="text-sm text-muted">
              Private repositories where this account has administrator
              permission will appear in the product form.
            </p>
            <div className="flex flex-wrap gap-3">
              {oauthConfig.ready ? (
                <a
                  href="/api/github/oauth/start"
                  className="inline-flex min-h-10 items-center justify-center rounded-lg border border-border px-4 text-sm font-medium hover:bg-background"
                >
                  Reauthorize GitHub
                </a>
              ) : (
                <span className="inline-flex min-h-10 cursor-not-allowed items-center justify-center rounded-lg border border-border px-4 text-sm font-medium text-muted opacity-60">
                  Reauthorize GitHub
                </span>
              )}
              <form action="/api/github/disconnect" method="post">
                <Button type="submit" variant="danger">
                  Disconnect GitHub
                </Button>
              </form>
            </div>
          </div>
        ) : (
          oauthConfig.ready ? (
            <a
              href="/api/github/oauth/start"
              className="mt-6 inline-flex min-h-10 items-center justify-center rounded-lg bg-[#24292f] px-4 text-sm font-semibold text-white hover:bg-black"
            >
              Authorize GitHub account
            </a>
          ) : (
            <span className="mt-6 inline-flex min-h-10 cursor-not-allowed items-center justify-center rounded-lg bg-[#24292f] px-4 text-sm font-semibold text-white opacity-50">
              Authorize GitHub account
            </span>
          )
        )}

        <p className="mt-6 text-sm leading-5 text-muted">
          GitHub OAuth’s repository scope covers private repository code and
          collaborator management. Tokens are encrypted before storage.
        </p>
      </section>
    </div>
  );
}
