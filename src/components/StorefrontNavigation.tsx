import Link from "next/link";
import type { StorefrontNavigationProps } from "./StorefrontMenus.types";
import clsx from "clsx";

export function StorefrontNavigation({
  pages,
  affiliatesEnabled,
  showDashboard = false,
  className = "",
  basePath = "",
}: StorefrontNavigationProps) {
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
    </nav>
  );
}
