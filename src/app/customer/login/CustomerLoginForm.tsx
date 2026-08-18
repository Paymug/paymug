"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Alert, Button, Input } from "@/components/ui";
import type { CustomerAuthResponse } from "./CustomerLoginForm.types";

export function CustomerLoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [usePassword, setUsePassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function signIn(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setMessage(null);
    setError(null);
    const response = await fetch(
      usePassword
        ? "/api/customer/auth/password"
        : "/api/customer/auth/request-link",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          ...(usePassword ? { password } : {}),
        }),
      },
    );
    const data = (await response.json()) as CustomerAuthResponse;
    setSubmitting(false);
    if (!response.ok) {
      setError(
        data.error ||
          (usePassword
            ? "Invalid email or password"
            : "Could not send sign-in link"),
      );
      return;
    }
    if (usePassword) {
      router.push("/customer");
      router.refresh();
      return;
    }
    setMessage(data.message || "Check your email for a sign-in link.");
  }

  return (
    <form
      onSubmit={signIn}
      className="rounded-2xl border border-border bg-white p-6 shadow-sm"
    >
      <h2 className="text-lg font-semibold">
        {usePassword ? "Sign in with password" : "Email sign-in link"}
      </h2>
      <p className="mt-1 text-sm text-muted">
        {usePassword
          ? "Use the password you created inside the customer portal."
          : "Receive a secure, one-time link that expires after 15 minutes."}
      </p>

      <div className="mt-5 space-y-4">
        <Input
          label="Purchase email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />
        {usePassword && (
          <Input
            label="Password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            minLength={8}
            required
          />
        )}
      </div>

      <div className="mt-5 flex items-center justify-between gap-4 rounded-xl bg-[#f7f7f8] px-3 py-2.5">
        <div>
          <p className="text-sm font-medium">Use password</p>
          {/* <p className="text-sm text-muted">
              Switch off to receive an email link.
            </p> */}
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={usePassword}
          onClick={() => {
            setUsePassword((current) => !current);
            setMessage(null);
            setError(null);
          }}
          className={`relative h-6 w-11 shrink-0 rounded-full transition ${
            usePassword ? "bg-accent" : "bg-[#d8d8e0]"
          }`}
        >
          <span
            className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition ${
              usePassword ? "translate-x-5" : "translate-x-0"
            }`}
          />
          <span className="sr-only">
            {usePassword ? "Use email link" : "Use password"}
          </span>
        </button>
      </div>

      <Button type="submit" className="mt-4" disabled={submitting}>
        {submitting
          ? usePassword
            ? "Signing in…"
            : "Sending…"
          : usePassword
            ? "Sign in"
            : "Email me a sign-in link"}
      </Button>

      {(message || error) && (
        <div className="mt-4">
          {message ? (
            <Alert variant="success">{message}</Alert>
          ) : (
            <Alert>{error}</Alert>
          )}
        </div>
      )}
    </form>
  );
}
