"use client";

import { useState } from "react";

/** Copies the invoice URL so the merchant can send it to the customer to pay. */
export function CopyPayLinkButton() {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt("Copy this payment link", window.location.href);
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      className="cursor-pointer rounded-lg bg-[#ffd84d] px-4 py-2 text-sm font-semibold text-[#2a2a33] transition hover:bg-[#ffcf1f]"
    >
      {copied ? "Link copied" : "Copy payment link"}
    </button>
  );
}
