"use client";

import { useState } from "react";
import { Alert, Button, Input } from "./ui";
import type {
  StoreSubscribeFormProps,
  StoreSubscribeResponse,
} from "./StoreSubscribeForm.types";

export function StoreSubscribeForm({
  storeSlug,
}: StoreSubscribeFormProps) {
  const [email, setEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function subscribe(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    const response = await fetch(`/api/store/${storeSlug}/subscribe`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const data = (await response.json()) as StoreSubscribeResponse;
    setSaving(false);
    if (!response.ok) {
      setError(data.error || "Could not subscribe");
      return;
    }
    setSuccess(true);
    setEmail("");
  }

  if (success) {
    return <Alert variant="success">You’re subscribed. Check your inbox for future updates.</Alert>;
  }

  return (
    <form onSubmit={subscribe} className="flex flex-col gap-3 mx-auto w-full sm:flex-row sm:items-end max-w-md mt-5 relative text-sm">
      <Input
        name="subscriberEmail"
        type="email"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        placeholder="Enter your email"
        className="flex-1 *:py-3"
        required
      />
      <Button className="absolute top-1 right-1 rounded-lg" type="submit" disabled={saving}>
        {saving ? "Joining…" : "Subscribe"}
      </Button>
      {error && <Alert>{error}</Alert>}
    </form>
  );
}
