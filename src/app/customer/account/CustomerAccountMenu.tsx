"use client";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  LockIcon,
  Logout01Icon,
  Mail01Icon,
  UserCircleIcon,
} from "@hugeicons/core-free-icons";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";

const menuItems = [
  { href: "/customer/account", label: "Profile details", icon: UserCircleIcon },
  { href: "/customer/account/password", label: "Passwords", icon: LockIcon },
  {
    href: "/customer/account/email-preferences",
    label: "Email preferences",
    icon: Mail01Icon,
  },
];

export function CustomerAccountMenu() {
  const pathname = usePathname();
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);

  async function signOut() {
    setSigningOut(true);
    await fetch("/api/customer/auth/logout", { method: "POST" });
    router.push("/customer/login");
    router.refresh();
  }

  return (
    <nav
      aria-label="Account settings"
      className="h-fit rounded-xl border border-[#e8e8ee] bg-white p-2"
    >
      {menuItems.map(({ href, label, icon: Icon }) => (
        <Link
          key={href}
          href={href}
          className={`mb-1 flex min-h-10 items-center gap-3 rounded-lg px-3.5 text-sm font-medium transition ${
            pathname === href
              ? "bg-[#f7f7f8] text-[#333]"
              : "text-[#555563] hover:bg-[#f7f7f8]"
          }`}
        >
          <HugeiconsIcon icon={Icon} size={18} className="text-[#9191aa]" />
          {label}
        </Link>
      ))}
      <button
        type="button"
        onClick={signOut}
        disabled={signingOut}
        className="flex min-h-10 w-full items-center gap-3 rounded-lg px-3.5 text-sm font-medium text-red-600 transition hover:bg-[#f7f7f8] disabled:opacity-60"
      >
        <HugeiconsIcon icon={Logout01Icon} size={18} className="text-red-600" />
        {signingOut ? "Signing out…" : "Sign out"}
      </button>
    </nav>
  );
}
