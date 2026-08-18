import type { NotificationRecord } from "@/lib/notifications.types";

export interface DashboardNotificationsProps {
  initialNotifications: NotificationRecord[];
  initialHasUnread: boolean;
}

export interface DashboardTopbarProps extends DashboardNotificationsProps {}
