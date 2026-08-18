"use client";

import { useState } from "react";
import { Alert, Button, Input, Textarea } from "@/components/ui";
import type {
  AffiliateApplicationFormProps,
  AffiliateApplicationResponse,
} from "./page.types";

export function AffiliateApplicationForm({
  storeSlug,
}: AffiliateApplicationFormProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [about, setAbout] = useState("");
  const [websites, setWebsites] = useState("");
  const [socialLinks, setSocialLinks] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [applied, setApplied] = useState(false);
  const expanded = Boolean(name.trim() || email.trim());

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/stores/${encodeURIComponent(storeSlug)}/affiliates`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, email, about, websites, socialLinks }),
        }
      );
      const data = (await response.json()) as AffiliateApplicationResponse;
      if (!response.ok) {
        throw new Error(data.error || "Could not submit your application");
      }
      setApplied(true);
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Could not submit your application"
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (applied) {
    return (
      <Alert variant="success">
        Your application was submitted. The store owner will review it before
        your affiliate link becomes active.
      </Alert>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <Input
        label="Your name"
        name="name"
        value={name}
        onChange={(event) => setName(event.target.value)}
        required
      />
      <Input
        label="Email address"
        name="email"
        type="email"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        required
      />
      {expanded && (
        <>
          <Textarea
            label="About you"
            name="about"
            value={about}
            onChange={(event) => setAbout(event.target.value)}
            placeholder="Tell the store about your audience and content"
            required
          />
          <Textarea
            label="Websites"
            name="websites"
            value={websites}
            onChange={(event) => setWebsites(event.target.value)}
            placeholder="One website per line"
          />
          <Textarea
            label="Social links"
            name="socialLinks"
            value={socialLinks}
            onChange={(event) => setSocialLinks(event.target.value)}
            placeholder="One social profile per line"
          />
          {error && <Alert>{error}</Alert>}
          <Button type="submit" disabled={submitting}>
            {submitting ? "Submitting…" : "Apply to join"}
          </Button>
        </>
      )}
    </form>
  );
}
