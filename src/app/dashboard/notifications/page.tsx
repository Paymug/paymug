import { getSessionUser } from "@/lib/auth";
import {
  dashboardPageClass,
  dashboardPageCopyClass,
} from "@/components/dashboard/dashboard.styles";
import { NotificationHistory } from "@/components/dashboard/NotificationHistory";

export default async function NotificationsPage() {
  const user = await getSessionUser();
  if (!user) return null;

  return (
    <div className={dashboardPageClass}>
      <h1 className="sr-only">Notifications</h1>
      <p className={dashboardPageCopyClass}>All past store activity.</p>
      <NotificationHistory />
    </div>
  );
}
