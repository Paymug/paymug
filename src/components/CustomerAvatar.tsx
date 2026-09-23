"use client";

import { useEffect, useState } from "react";

export function getCustomerInitials(name: string, email: string): string {
  const source = name.trim() || email.trim();
  if (!source) return "?";
  const parts = source.split(/[\s@._-]+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  return source.slice(0, 2).toUpperCase();
}

const sizes = {
  xs: "h-6 w-6 text-[10px]",
  sm: "h-8 w-8 text-[11px]",
  md: "h-9 w-9 text-xs",
  lg: "h-11 w-11 text-sm",
} as const;

export function CustomerAvatar({
  name,
  email,
  avatarUrl,
  size = "md",
}: {
  name: string;
  email: string;
  avatarUrl?: string;
  size?: keyof typeof sizes;
}) {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [avatarUrl]);

  if (avatarUrl && !failed) {
    return (
      <img
        src={avatarUrl}
        alt=""
        onError={() => setFailed(true)}
        className={`${sizes[size]} shrink-0 rounded-full object-cover ring-1 ring-[#ececf1]`}
      />
    );
  }

  return (
    <span
      className={`${sizes[size]} grid shrink-0 place-items-center rounded-full bg-[#f0f0f5] font-semibold text-[#6f6f84] ring-1 ring-[#ececf1]`}
      aria-hidden
    >
      {getCustomerInitials(name, email)}
    </span>
  );
}
