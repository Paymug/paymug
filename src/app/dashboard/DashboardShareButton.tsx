"use client";

import { ShareNetwork } from "@phosphor-icons/react";
import { useState } from "react";
import { shareDashboardView } from "./dashboard-share.utils";
import type { DashboardShareButtonProps } from "./dashboard-overview.types";

export function DashboardShareButton(props: DashboardShareButtonProps) {
  const [copied, setCopied] = useState(false);

  async function share() {
    try {
      const result = await shareDashboardView(props);
      if (result !== "copied") return;
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  }

  return (
    <button
      type="button"
      onClick={share}
      className="inline-flex items-center gap-2 text-sm font-medium text-[#333] hover:text-accent-hover"
    >
      <ShareNetwork size={16} aria-hidden />
      {copied ? "Copied" : "Share"}
    </button>
  );
}
