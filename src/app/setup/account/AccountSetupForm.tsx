"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Alert, Button, Input } from "@/components/ui";
import type { CreateAccountResponse } from "./AccountSetupForm.types";

export function AccountSetupForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function createAccount(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });
      const data = (await response.json()) as CreateAccountResponse;
      if (!response.ok) {
        throw new Error(data.error || "Could not create account");
      }
      router.push("/setup/store");
      router.refresh();
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Could not create account",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={createAccount} className="mt-6 space-y-4">
      {error && <Alert>{error}</Alert>}
      <Input
        label="Your name"
        name="name"
        value={name}
        onChange={(event) => setName(event.target.value)}
        required
      />
      <Input
        label="Email"
        type="email"
        name="email"
        autoComplete="email"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        required
      />
      <Input
        label="Password"
        type="password"
        name="password"
        autoComplete="new-password"
        value={password}
        onChange={(event) => setPassword(event.target.value)}
        minLength={8}
        required
      />
      <p className="text-sm text-muted">At least 8 characters</p>
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? "Creating…" : "Create account"}
      </Button>
    </form>
  );
}
