"use client";

import {
  DotsThree,
  EnvelopeSimple,
  Eye,
  EyeSlash,
  GearSix,
  House,
  Network,
  Plus,
  SidebarSimple,
  SignOut,
  SlidersHorizontal,
  Storefront,
} from "@phosphor-icons/react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { DashboardEnvironmentSwitch } from "./dashboard/DashboardEnvironmentSwitch";
import { AppIcon } from "./dashboard/Icon";
import { DashboardLogoMark } from "./dashboard/DashboardLogoMark";
import { DashboardNavGroup } from "./dashboard/DashboardNavGroup";
import {
  dashboardHomeLink,
  dashboardNavGroups,
  dashboardSetupLink,
} from "./dashboard-nav.config";
import {
  getVisibleDashboardNavGroups,
  isDashboardNavGroupActive,
  isDashboardNavItemActive,
} from "./dashboard-nav.utils";
import { useDashboardShell } from "./dashboard/DashboardShell";
import type { DashboardNavProps } from "./DashboardNav.types";
import clsx from "clsx";
import { cardClass } from "./ui.styles";

export function DashboardNav({
  storeName,
  stores,
  activeStoreId,
  userName,
  environment,
  environmentAvailability,
  setupProgress,
  affiliatesEnabled,
  emailCampaignsEnabled,
  analyticsEnabled,
}: DashboardNavProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { collapsed, toggle } = useDashboardShell();
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [storeSwitching, setStoreSwitching] = useState(false);
  const [showInactiveStores, setShowInactiveStores] = useState(false);
  const hasInactiveStores = stores.some((store) => !store.isActive);
  const menuStores = showInactiveStores
    ? stores
    : stores.filter((store) => store.isActive);
  const visibleNavGroups = getVisibleDashboardNavGroups(dashboardNavGroups, {
    affiliatesEnabled,
    emailCampaignsEnabled,
    analyticsEnabled,
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

  async function switchStore(storeId: string, isActive: boolean) {
    if (storeId === activeStoreId) return;
    setStoreSwitching(true);
    if (!isActive) {
      const reactivationResponse = await fetch(
        `/api/stores/${storeId}/reactivate`,
        { method: "POST" },
      );
      if (!reactivationResponse.ok) {
        setStoreSwitching(false);
        return;
      }
    }
    const response = await fetch(`/api/stores/${storeId}/activate`, {
      method: "POST",
    });
    setStoreSwitching(false);
    if (!response.ok) return;
    setAccountMenuOpen(false);
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
      <aside className="sticky top-0 z-30 col-start-1 row-span-2 hidden h-dvh w-full flex-col self-start bg-white lg:flex">
        <div
          className={`flex h-[5.5rem] shrink-0 items-center ${
            collapsed ? "justify-center" : "justify-between px-6"
          }`}
        >
          {!collapsed && <DashboardLogoMark />}
          <button
            type="button"
            onClick={toggle}
            aria-label={collapsed ? "Expand menu" : "Collapse menu"}
            aria-expanded={!collapsed}
            title={collapsed ? "Expand menu" : "Collapse menu"}
            className="grid h-9 w-9 shrink-0 cursor-pointer place-items-center rounded-lg text-[#85859d] transition hover:bg-[#f7f7f8] hover:text-foreground"
          >
            {collapsed ? (
              <AppIcon size={28} />
            ) : (
              <SidebarSimple size={19} weight="regular" aria-hidden />
            )}
          </button>
        </div>

        {collapsed && (
          <div className="flex min-h-0 flex-1 flex-col items-center gap-1 pb-4">
            <Link
              href={dashboardHomeLink.href}
              aria-label={dashboardHomeLink.label}
              aria-current={
                isDashboardNavItemActive(pathname, dashboardHomeLink)
                  ? "page"
                  : undefined
              }
              className={`flex h-10 w-10 items-center justify-center rounded-xl transition ${
                isDashboardNavItemActive(pathname, dashboardHomeLink)
                  ? "bg-[#f7f7f8] text-accent-hover"
                  : "text-[#333] hover:bg-[#f7f7f8]"
              }`}
            >
              <House size={19} weight="regular" aria-hidden />
            </Link>

            {visibleNavGroups.map((group) => {
              const groupActive = isDashboardNavGroupActive(pathname, group);
              return (
                <div
                  key={group.id}
                  className="group relative flex w-full justify-center"
                >
                  <button
                    type="button"
                    aria-label={group.label}
                    className={`flex h-10 w-10 cursor-default items-center justify-center rounded-xl transition ${
                      groupActive
                        ? "bg-[#f7f7f8] text-accent-hover"
                        : "text-[#333] hover:bg-[#f7f7f8]"
                    }`}
                  >
                    {groupIcons[group.id]}
                  </button>
                  <div className="pointer-events-none invisible absolute left-full top-0 z-[80] pl-3 opacity-0 transition before:absolute before:-left-4 before:top-0 before:h-full before:w-4 before:content-[''] group-hover:pointer-events-auto group-hover:visible group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:visible group-focus-within:opacity-100">
                    <div className="w-52 rounded-xl border border-[#e8e8ee] bg-white py-2 shadow-xl">
                      <p className="px-3.5 pb-1 pt-1 text-sm font-medium text-[#333]">
                        {group.label}
                      </p>
                      <div className="relative grid before:absolute before:bottom-4 before:left-2 before:top-4 before:w-px before:bg-[#e8e8ee] before:ml-3">
                        {group.items.map((item) => {
                          const itemActive = isDashboardNavItemActive(
                            pathname,
                            item,
                          );
                          return (
                            <Link
                              key={item.href}
                              href={item.href}
                              aria-current={itemActive ? "page" : undefined}
                              className={`relative pl-11 flex min-h-9 items-center rounded-xl px-2.5 text-sm transition before:absolute before:left-[17.5px] before:h-1.5 before:w-1.5 before:rounded-full  ${
                                itemActive
                                  ? "bg-[#f7f7f8] before:bg-accent"
                                  : "text-[#74748f] before:bg-[#e8e8ee] hover:bg-[#f7f7f8]"
                              }`}
                            >
                              {item.label}
                            </Link>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}

            <Link
              href={dashboardSetupLink.href}
              aria-label={dashboardSetupLink.label}
              aria-current={
                isDashboardNavItemActive(pathname, dashboardSetupLink)
                  ? "page"
                  : undefined
              }
              className={`flex h-10 w-10 items-center justify-center rounded-xl transition ${
                isDashboardNavItemActive(pathname, dashboardSetupLink)
                  ? "bg-[#f7f7f8] text-accent-hover"
                  : "text-[#333] hover:bg-[#f7f7f8]"
              }`}
            >
              <SlidersHorizontal size={18} weight="regular" aria-hidden />
            </Link>

          </div>
        )}

        <div
          className={
            collapsed ? "hidden" : "flex min-h-0 flex-1 flex-col overflow-hidden"
          }
        >
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
              <div className="max-h-64 overflow-y-auto px-1">
                {menuStores.map((store) => {
                  const active = store.id === activeStoreId;
                  return (
                    <div key={store.id} className="flex items-center rounded-lg hover:bg-[#f7f7f8]">
                      <button
                        type="button"
                        disabled={storeSwitching || active}
                        onClick={() => void switchStore(store.id, store.isActive)}
                        className="flex min-w-0 flex-1 items-center gap-2 px-2 py-2 text-left text-sm disabled:cursor-default"
                      >
                        <Storefront size={16} className="shrink-0" />
                        <span className="min-w-0 flex-1 truncate">
                          {store.name}
                        </span>
                        {!store.isActive && (
                          <span className="text-xs font-medium text-muted">
                            Inactive
                          </span>
                        )}
                        {/* {active && (
                          <span className="text-xs font-medium text-muted">
                            Active
                          </span>
                        )} */}
                      </button>
                    </div>
                  );
                })}
                <Link
                  href="/dashboard/stores#add-store"
                  onClick={() => setAccountMenuOpen(false)}
                  className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm hover:bg-[#f7f7f8]"
                >
                  <Plus size={16} />
                  Add store
                </Link>
                {hasInactiveStores && (
                  <button
                    type="button"
                    onClick={() => setShowInactiveStores((visible) => !visible)}
                    className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm text-muted hover:bg-[#f7f7f8] hover:text-foreground"
                  >
                    {showInactiveStores ? <EyeSlash size={16} /> : <Eye size={16} />}
                    {showInactiveStores
                      ? "Hide inactive stores"
                      : "Show inactive stores"}
                  </button>
                )}
              </div>
              <div className="mx-1 mt-1 border-t border-[#e8e8ee] pt-1">
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
