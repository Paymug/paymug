import Link from "next/link";
import type { StorefrontNavigationProps } from "./StorefrontMenus.types";
import clsx from "clsx";
import { DashboardNotifications } from "./dashboard/DashboardNotifications";
import { getSessionUser } from "@/lib/auth";
import { countUnreadNotifications, listNotifications } from "@/lib/notifications";

export async function StorefrontNavigation({
  pages,
  affiliatesEnabled,
  showDashboard = false,
  className = "",
  basePath = "",
}: StorefrontNavigationProps) {
  const viewer = showDashboard ? await getSessionUser() : null;
  const [notifications, unreadCount] = viewer
    ? await Promise.all([
        listNotifications(viewer.id, 12, viewer.environment),
        countUnreadNotifications(viewer.id, viewer.environment),
      ])
    : [[], 0];

  return (
    <nav
      className={clsx("flex flex-wrap items-center *:p-4", className)}
      aria-label="Store navigation"
    >

      {showDashboard && (
        <Link
          href="/dashboard"
          className="text-sm font-medium text-foreground hover:text-accent-dark flex flex-row items-center gap-2"
        >
          {/* <HouseSimple size={14} strokeWidth={4} /> */}
          Dashboard
        </Link>
      )}

      {pages.map((page) => (
        <Link
          key={page.id}
          href={`${basePath}/${page.slug}`}
          className="text-sm font-medium text-foreground hover:text-accent-dark"
        >
          {page.navigationLabel || page.title}
        </Link>
      ))}
      {affiliatesEnabled && (
        <Link
          href={`${basePath}/affiliates`}
          className="text-sm font-medium text-foreground hover:text-accent-dark"
        >
          Affiliate Program
        </Link>
      )}
      <Link
        href="/customer/login"
        className="text-sm font-medium text-foreground hover:text-accent-dark"
      >
        My Orders
      </Link>
      {showDashboard && viewer && (
        <div className="flex items-center justify-center">
          <DashboardNotifications
            initialNotifications={notifications}
            initialHasUnread={unreadCount > 0}
            initialUnreadCount={unreadCount}
          />
        </div>
      )}
    </nav>
  );
}
