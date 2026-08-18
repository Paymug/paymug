"use client";

import {
  DotsThree,
  EnvelopeSimple,
  GearSix,
  House,
  Network,
  SignOut,
  SlidersHorizontal,
  Storefront,
} from "@phosphor-icons/react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { DashboardEnvironmentSwitch } from "./dashboard/DashboardEnvironmentSwitch";
import { DashboardLogoMark } from "./dashboard/DashboardLogoMark";
import { DashboardNavGroup } from "./dashboard/DashboardNavGroup";
import {
  dashboardHomeLink,
  dashboardNavGroups,
  dashboardSetupLink,
} from "./dashboard-nav.config";
import {
  getVisibleDashboardNavGroups,
  isDashboardNavItemActive,
} from "./dashboard-nav.utils";
import type { DashboardNavProps } from "./DashboardNav.types";
import clsx from "clsx";
import { cardClass } from "./ui.styles";

export function DashboardNav({
  storeName,
  userName,
  environment,
  environmentAvailability,
  setupProgress,
  affiliatesEnabled,
  emailCampaignsEnabled,
}: DashboardNavProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const visibleNavGroups = getVisibleDashboardNavGroups(dashboardNavGroups, {
    affiliatesEnabled,
    emailCampaignsEnabled,
  });
  const visibleMobileLinks = [
    dashboardHomeLink,
    ...visibleNavGroups.flatMap((group) => group.items),
    dashboardSetupLink,
  ];

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  const groupIcons = {
    store: <Storefront size={17} weight="regular" aria-hidden />,
    email: <EnvelopeSimple size={17} weight="regular" aria-hidden />,
    affiliates: <Network size={17} weight="regular" aria-hidden />,
    settings: <GearSix size={17} weight="regular" aria-hidden />,
  };

  return (
    <>
      <aside className="sticky top-0 col-start-1 row-span-2 hidden h-dvh w-60 flex-col self-start overflow-hidden bg-white lg:flex">
        <div className="flex h-[5.5rem] shrink-0 items-center px-6">
          <DashboardLogoMark />
        </div>

        <nav
          className="min-h-0 flex-1 overflow-y-auto px-5 pb-4 pt-1"
          aria-label="Dashboard navigation"
        >
          <Link
            href={dashboardHomeLink.href}
            aria-current={
              isDashboardNavItemActive(pathname, dashboardHomeLink)
                ? "page"
                : undefined
            }
            className={`mb-2 flex min-h-9 items-center gap-3 rounded-xl px-3.5 text-sm font-medium transition ${
              isDashboardNavItemActive(pathname, dashboardHomeLink)
                ? "bg-[#f7f7f8]"
                : "text-[#333] hover:bg-[#f7f7f8] [&_svg]:text-[#9191aa]"
            }`}
          >
            <House size={18} weight="regular" />
            {dashboardHomeLink.label}
          </Link>

          {visibleNavGroups.map((group) => (
            <DashboardNavGroup
              key={group.id}
              group={group}
              icon={groupIcons[group.id]}
              pathname={pathname}
            />
          ))}

          <Link
            href={dashboardSetupLink.href}
            aria-current={
              isDashboardNavItemActive(pathname, dashboardSetupLink)
                ? "page"
                : undefined
            }
            className={`mt-2 flex min-h-9 items-center gap-3 rounded-xl px-3.5 text-sm font-medium transition ${
              isDashboardNavItemActive(pathname, dashboardSetupLink)
                ? "bg-[#f7f7f8]"
                : "text-[#333] hover:bg-[#f7f7f8]"
            }`}
          >
            <SlidersHorizontal size={17} weight="regular" />
            {dashboardSetupLink.label}
            <span className="ml-auto grid min-w-9 place-items-center rounded-full px-1.5 py-0.5 font-semibold text-[10px] bg-accent">
              {setupProgress}%
            </span>
          </Link>
        </nav>

        <DashboardEnvironmentSwitch
          environment={environment}
          availability={environmentAvailability}
        />


        <div
          className={clsx(
            "relative mx-4 flex shrink-0 items-center justify-between gap-3 border-t border-[#e8e8ee] py-2 px-4 mb-4",
            cardClass,
          )}
        >
          {accountMenuOpen && (
            <div className="absolute bottom-full left-0 z-30 mb-2 w-full overflow-hidden rounded-xl border border-[#e8e8ee] bg-white py-2 shadow-xl">
              <div className="px-1">
                <button
                  type="button"
                  onClick={logout}
                  className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm text-red-600 hover:bg-red-50"
                >
                  <SignOut size={16} />
                  Log out
                </button>
              </div>
            </div>
          )}
          <div>
            {/* <p className="truncate text-sm font-semibold text-foreground">
              {storeName}
            </p> */}
            <Link
              href={`/dashboard/settings/store`}
              className="block truncate text-sm font-medium hover:text-accent-hover"
            >
              {storeName}
            </Link>
          </div>
          <button
            type="button"
            onClick={() => setAccountMenuOpen((open) => !open)}
            className="shrink-0 cursor-pointer p-1.5 font-bold tracking-widest text-[#85859d] hover:text-accent-hover"
            aria-label={`Open account menu for ${userName}`}
            aria-expanded={accountMenuOpen}
          >
            <DotsThree size={20} weight="bold" aria-hidden />
          </button>
        </div>

      </aside>

      <header className="row-start-1 border-b border-[#e8e8ee] bg-white lg:hidden">
        <div className="flex h-14 items-center justify-between px-4">
          <DashboardLogoMark />
          <button
            type="button"
            onClick={logout}
            className="text-sm font-medium text-muted hover:text-foreground"
          >
            Sign out
          </button>
        </div>
        <nav
          className="flex gap-1 overflow-x-auto px-3 pb-3"
          aria-label="Dashboard navigation"
        >
          {visibleMobileLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              aria-current={
                isDashboardNavItemActive(pathname, link) ? "page" : undefined
              }
              className={`shrink-0 rounded-lg px-3 py-2 text-sm font-medium ${
                isDashboardNavItemActive(pathname, link)
                  ? "bg-accent-soft text-accent-hover"
                  : "text-muted hover:bg-[#f7f7f8] hover:text-foreground"
              }`}
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </header>
    </>
  );
}
