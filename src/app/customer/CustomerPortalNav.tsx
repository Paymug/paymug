"use client";

import {
  ChartLineUp,
  CurrencyDollar,
  House,
  Package,
  UserCircle,
} from "@phosphor-icons/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AppIcon } from "@/components/dashboard/Icon";
import { isCustomerPortalNavItemActive } from "./customer-portal.utils";
import type { CustomerPortalNavProps } from "./CustomerPortalNav.types";
import Powered from "@/components/PoweredBy";

const navItems = [
  { href: "/customer", label: "Home", icon: House },
  // { href: "/customer#purchases", label: "Purchases", icon: Package },
  // {
  //   href: "/customer#subscriptions",
  //   label: "Subscriptions",
  //   icon: ArrowsClockwise,
  // },
];

const affiliateNavItems = [
  {
    href: "/customer/affiliate",
    label: "Overview",
    icon: ChartLineUp,
  },
  {
    href: "/customer/affiliate/products",
    label: "Products",
    icon: Package,
  },
  {
    href: "/customer/affiliate/payouts",
    label: "Payouts",
    icon: CurrencyDollar,
  },
];

const accountNavItem = {
  href: "/customer/account",
  label: "Account",
  icon: UserCircle,
};

export function CustomerPortalNav({
  customer,
  affiliateEnabled,
  branding,
}: CustomerPortalNavProps) {
  const pathname = usePathname();
  const customerNavItems = [...navItems, accountNavItem];
  const visibleNavItems = [
    ...customerNavItems,
    ...(affiliateEnabled ? affiliateNavItems : []),
  ];
  return (
    <>
      <aside className="sticky top-0 col-start-1 row-span-2 hidden h-dvh w-60 flex-col self-start bg-white lg:flex">
        <div className="flex h-[5.5rem] shrink-0 items-center px-6">
          <Link
            href="/customer"
            className="flex min-w-0 items-center gap-2.5"
            aria-label={`${branding?.storeName || "Paymug"} customer portal`}
          >
            {branding?.storeLogoImageUrl ? (
              <img
                src={branding.storeLogoImageUrl}
                alt=""
                className="h-9 w-9 shrink-0 rounded-xl object-cover"
              />
            ) : (
              <AppIcon size={36} />
            )}
            <span className="truncate text-base font-bold tracking-tight text-[#333]">
              {branding?.storeName || "Paymug"}
            </span>
          </Link>
        </div>
        <nav className="flex-1 px-5 pt-1" aria-label="Customer portal navigation">
          <p className="px-3.5 pb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#a0a0b2]">
            Customer portal
          </p>
          {customerNavItems.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={`mb-1 flex min-h-10 items-center gap-3 rounded-xl px-3.5 text-sm font-medium transition ${
                isCustomerPortalNavItemActive(pathname, href)
                  ? "bg-[#f7f7f8] text-[#333]"
                  : "text-[#555563] hover:bg-[#f7f7f8]"
              }`}
            >
              <Icon size={18} weight="regular" className="text-[#9191aa]" />
              {label}
            </Link>
          ))}
          {affiliateEnabled && (
            <>
              <p className="px-3.5 pb-2 pt-6 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#a0a0b2]">
                Affiliate
              </p>
              {affiliateNavItems.map(({ href, label, icon: Icon }) => (
                <Link
                  key={href}
                  href={href}
                  className={`mb-1 flex min-h-10 items-center gap-3 rounded-xl px-3.5 text-sm font-medium transition ${
                    isCustomerPortalNavItemActive(pathname, href)
                      ? "bg-[#f7f7f8] text-[#333]"
                      : "text-[#555563] hover:bg-[#f7f7f8]"
                  }`}
                >
                  <Icon size={18} weight="regular" className="text-[#9191aa]" />
                  {label}
                </Link>
              ))}
            </>
          )}
        </nav>
        <div className="mx-6 border-t border-[#e8e8ee] pb-4 pt-4">
          <p className="text-xs font-medium uppercase tracking-wide text-[#a0a0b2]">
            Signed in as
          </p>
          <div className="mt-2 flex items-center gap-2.5">
            {customer.avatarImageUrl ? (
              <img
                src={customer.avatarImageUrl}
                alt=""
                className="h-8 w-8 shrink-0 rounded-full object-cover"
              />
            ) : (
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#fff6d1] text-xs font-bold text-[#8a6800]">
                {(customer.name || customer.email).slice(0, 1).toUpperCase()}
              </span>
            )}
            <div className="min-w-0">
              {customer.name && (
                <p className="truncate text-sm font-semibold text-[#3a3a45]">
                  {customer.name}
                </p>
              )}
              <p className="truncate text-xs text-[#85859d]">{customer.email}</p>
            </div>
          </div>
        </div>
        <Powered />
      </aside>

      <header className="row-start-1 border-b border-[#e8e8ee] bg-white lg:hidden">
        <div className="flex h-14 items-center justify-between px-4">
          <Link
            href="/customer"
            className="flex min-w-0 items-center gap-2"
            aria-label={`${branding?.storeName || "Paymug"} customer portal`}
          >
            {branding?.storeLogoImageUrl ? (
              <img
                src={branding.storeLogoImageUrl}
                alt=""
                className="h-8 w-8 shrink-0 rounded-lg object-cover"
              />
            ) : (
              <AppIcon size={32} />
            )}
            <span className="max-w-40 truncate text-sm font-bold tracking-tight">
              {branding?.storeName || "Paymug"}
            </span>
          </Link>
          <span className="max-w-44 truncate text-xs text-[#85859d]">
            {customer.name || customer.email}
          </span>
        </div>
        <nav
          className="flex gap-1 overflow-x-auto px-3 pb-3"
          aria-label="Customer portal navigation"
        >
          {visibleNavItems.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className={`shrink-0 rounded-lg px-3 py-2 text-sm font-medium ${
                isCustomerPortalNavItemActive(pathname, href)
                  ? "bg-[#fff6d1] text-[#8a6800]"
                  : "text-[#85859d] hover:bg-[#f7f7f8]"
              }`}
            >
              {label}
            </Link>
          ))}
        </nav>
      </header>
    </>
  );
}
