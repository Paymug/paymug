"use client";

import { useState } from "react";
import { Alert, Button, Input } from "@/components/ui";
import { getGitHubCallbackUrlForHostname } from "@/lib/github-hostname.utils";
import type {
  GitHubCallbackSettingsFormProps,
  GitHubCallbackSettingsResponse,
} from "./page.types";

export function GitHubCallbackSettingsForm({
  initialHostname,
  requestUrl,
}: GitHubCallbackSettingsFormProps) {
  const [hostname, setHostname] = useState(initialHostname);
  const [savedHostname, setSavedHostname] = useState(initialHostname);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  let callbackUrl = "";
  try {
    callbackUrl = getGitHubCallbackUrlForHostname(hostname, requestUrl);
  } catch {
    callbackUrl = "Enter a valid hostname";
  }

  async function saveHostname(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const response = await fetch("/api/github/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hostname }),
      });
      const data =
        (await response.json()) as GitHubCallbackSettingsResponse;
      if (!response.ok || !data.hostname) {
        throw new Error(data.error || "Could not save hostname");
      }
      setHostname(data.hostname);
      setSavedHostname(data.hostname);
      setSuccess("GitHub callback hostname updated.");
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Could not save hostname"
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={saveHostname} className="mt-5 space-y-3">
      <Input
        label="Callback hostname"
        value={hostname}
        onChange={(event) => setHostname(event.target.value)}
        placeholder="example.com"
        autoComplete="url"
        required
      />
      <p className="text-sm text-muted">
        The current domain is used by default. Change it when GitHub should
        return users to another public hostname.
      </p>
      <div>
        <p className="text-sm font-medium text-foreground">
          Authorization callback URL
        </p>
        <p className="mt-1 text-sm text-muted">
          Add this exact URL to the GitHub OAuth App configuration.
        </p>
        <code className="mt-3 block select-all break-all rounded-lg border border-border bg-white px-3 py-2 text-sm">
          {callbackUrl}
        </code>
      </div>
      {error && <Alert>{error}</Alert>}
      {success && <Alert variant="success">{success}</Alert>}
      <Button
        type="submit"
        variant="outline"
        disabled={saving || hostname.trim() === savedHostname}
      >
        {saving ? "Saving…" : "Save hostname"}
      </Button>
    </form>
  );
}
