import type { NotificationRecord } from "@/lib/notifications.types";

export interface DashboardNotificationsProps {
  initialNotifications: NotificationRecord[];
  initialHasUnread: boolean;
  initialUnreadCount?: number;
  buttonClassName?: string;
}

export interface DashboardTopbarProps extends DashboardNotificationsProps {}
