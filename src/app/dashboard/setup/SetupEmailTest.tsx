"use client";

import { useState } from "react";

export function SetupEmailTest() {
  const [status, setStatus] = useState<{
    kind: "sending" | "sent" | "error";
    message: string;
  }>();

  async function sendTest() {
    setStatus({ kind: "sending", message: "Sending test email…" });
    try {
      const response = await fetch("/api/setup/test-email", {
        method: "POST",
      });
      const data = (await response.json().catch(() => null)) as {
        error?: string;
        to?: string;
      } | null;
      setStatus(
        response.ok
          ? {
              kind: "sent",
              message: `Test email sent to ${data?.to || "your address"}. Check your inbox.`,
            }
          : {
              kind: "error",
              message: data?.error || "Could not send the test email",
            }
      );
    } catch {
      setStatus({ kind: "error", message: "Could not send the test email" });
    }
  }

  return (
    <div className="mt-3 flex flex-wrap items-center gap-3">
      <button
        type="button"
        onClick={() => void sendTest()}
        disabled={status?.kind === "sending"}
        className="cursor-pointer rounded-lg border border-[#e4e4ec] px-3 py-1.5 text-sm font-medium text-[#3f3f49] transition hover:bg-[#f7f7f8] disabled:cursor-not-allowed disabled:opacity-60"
      >
        Send test email
      </button>
      {status && (
        <span
          role="status"
          className={`text-sm ${
            status.kind === "error"
              ? "text-red-600"
              : status.kind === "sent"
                ? "text-[#178f55]"
                : "text-[#85859d]"
          }`}
        >
          {status.message}
        </span>
      )}
    </div>
  );
}
