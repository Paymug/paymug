"use client";

import { Lock, SignOut, UserCircle } from "@phosphor-icons/react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";

const menuItems = [
  { href: "/customer/account", label: "Profile details", icon: UserCircle },
  { href: "/customer/account/password", label: "Passwords", icon: Lock },
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
          <Icon size={18} weight="regular" className="text-[#9191aa]" />
          {label}
        </Link>
      ))}
      <button
        type="button"
        onClick={signOut}
        disabled={signingOut}
        className="flex min-h-10 w-full items-center gap-3 rounded-lg px-3.5 text-sm font-medium text-red-600 transition hover:bg-[#f7f7f8] disabled:opacity-60"
      >
        <SignOut size={18} weight="regular" className="text-red-600" />
        {signingOut ? "Signing out…" : "Sign out"}
      </button>
    </nav>
  );
}
