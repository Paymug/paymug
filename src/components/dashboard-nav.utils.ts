import type {
  DashboardFeatureVisibility,
  DashboardNavGroupConfig,
  DashboardNavItem,
} from "./DashboardNav.types";

export function getVisibleDashboardNavGroups(
  groups: DashboardNavGroupConfig[],
  visibility: DashboardFeatureVisibility
): DashboardNavGroupConfig[] {
  return groups
    .filter(
      (group) => group.id !== "affiliates" || visibility.affiliatesEnabled
    )
    .map((group) =>
      group.id === "email" && !visibility.emailCampaignsEnabled
        ? {
            ...group,
            items: group.items.filter(
              (item) => !item.href.startsWith(`/dashboard/email`)
            ),
          }
        : group
    )
    .filter((group) => group.items.length > 0);
}

export function isDashboardNavItemActive(
  pathname: string,
  item: DashboardNavItem
): boolean {
  return item.exact ? pathname === item.href : pathname.startsWith(item.href);
}

export function isDashboardNavGroupActive(
  pathname: string,
  group: DashboardNavGroupConfig
): boolean {
  return group.items.some((item) =>
    isDashboardNavItemActive(pathname, item)
  );
}
