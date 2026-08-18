"use client";

import { GithubLogo, PaperPlaneTilt, UserMinus } from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { CustomerGitHubAccessCardProps } from "./CustomerGitHubAccessCard.types";
import {
  invitePurchaseGitHubAccess,
  revokePurchaseGitHubAccess,
} from "./customer-github-access.utils";
import { getCustomerStatusClass } from "./customer-portal.utils";

export function CustomerGitHubAccessCard({
  orderId,
  repository,
  canInvite,
  initialUsername,
  initialStatus = "not_required",
  initialError,
}: CustomerGitHubAccessCardProps) {
  const router = useRouter();
  const [identity, setIdentity] = useState("");
  const [username, setUsername] = useState(initialUsername);
  const [status, setStatus] = useState(initialStatus);
  const [error, setError] = useState<string | null>(initialError || null);
  const [message, setMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const hasRecipient = Boolean(username && status !== "revoked");
  const statusLabel =
    !hasRecipient && (status === "not_required" || status === "revoked")
      ? "not invited"
      : status.replaceAll("_", " ");

  async function sendInvitation(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!identity.trim()) return;
    setSubmitting(true);
    setError(null);
    setMessage(null);
    try {
      const result = await invitePurchaseGitHubAccess(orderId, identity.trim());
      setUsername(result.username);
      setStatus(result.status);
      setError(result.error || null);
      setMessage(
        result.status === "invited"
          ? `GitHub sent an invitation to @${result.username}.`
          : result.status === "existing"
            ? `@${result.username} already has repository access.`
            : null,
      );
      setIdentity("");
      router.refresh();
    } catch (inviteError) {
      setError(
        inviteError instanceof Error
          ? inviteError.message
          : "Could not send the GitHub invitation",
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function revokeAccess() {
    if (
      !window.confirm(
        `Revoke @${username}'s access from this purchase? You can invite another GitHub account afterwards.`,
      )
    ) {
      return;
    }
    setSubmitting(true);
    setError(null);
    setMessage(null);
    try {
      const result = await revokePurchaseGitHubAccess(orderId);
      setUsername(result.username);
      setStatus(result.status);
      setError(result.error || null);
      if (!result.error) {
        setMessage("GitHub access was revoked. You can invite another account.");
      }
      router.refresh();
    } catch (revokeError) {
      setError(
        revokeError instanceof Error
          ? revokeError.message
          : "Could not revoke GitHub access",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="rounded-xl border border-[#e8e8ee] p-4">
      <div className="flex items-center gap-2 text-sm font-semibold">
        <GithubLogo size={18} />
        Private repository access
      </div>
      <div className="mt-3 flex items-center justify-between gap-4 rounded-lg bg-[#f7f7f8] px-3 py-2.5 text-sm">
        <span className="min-w-0 truncate font-medium">{repository}</span>
        <span
          className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold capitalize ${getCustomerStatusClass(status)}`}
        >
          {statusLabel}
        </span>
      </div>

      {hasRecipient ? (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs text-[#85859d]">GitHub recipient</p>
            <p className="mt-0.5 text-sm font-semibold">@{username}</p>
          </div>
          <button
            type="button"
            disabled={submitting}
            onClick={() => void revokeAccess()}
            className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-red-200 px-3 text-xs font-semibold text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <UserMinus size={15} />
            {submitting ? "Revoking…" : "Revoke access"}
          </button>
        </div>
      ) : canInvite ? (
        <form className="mt-4" onSubmit={sendInvitation}>
          <label
            htmlFor={`github-identity-${orderId}`}
            className="text-xs font-semibold text-[#555563]"
          >
            GitHub username or public profile email
          </label>
          <div className="mt-2 flex gap-2">
            <input
              id={`github-identity-${orderId}`}
              name="githubIdentity"
              value={identity}
              onChange={(event) => setIdentity(event.target.value)}
              placeholder="octocat or name@example.com"
              autoComplete="off"
              disabled={submitting}
              className="min-h-10 min-w-0 flex-1 rounded-lg border border-[#dedee6] bg-white px-3 text-sm outline-none transition focus:border-[#c99a00] focus:ring-2 focus:ring-[#fff2b8] disabled:opacity-60"
            />
            <button
              type="submit"
              disabled={submitting || !identity.trim()}
              className="inline-flex min-h-10 shrink-0 items-center gap-2 rounded-lg bg-[#333] px-3 text-xs font-semibold text-white transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-50"
            >
              <PaperPlaneTilt size={15} />
              {submitting ? "Sending…" : "Send invite"}
            </button>
          </div>
          <p className="mt-2 text-xs leading-5 text-[#85859d]">
            Email lookup only works when that email is public on the GitHub
            profile. A username always works.
          </p>
        </form>
      ) : (
        <p className="mt-4 rounded-lg bg-[#f7f7f8] px-3 py-2.5 text-xs leading-5 text-[#696978]">
          Repository invitations are no longer available for this purchase.
        </p>
      )}

      {message && (
        <p className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-xs leading-5 text-emerald-700">
          {message}
        </p>
      )}
      {error && (
        <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs leading-5 text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}
