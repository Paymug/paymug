import { dashboardPageClass, dashboardPageCopyClass } from "@/components/dashboard/dashboard.styles";
import { getSessionUser } from "@/lib/auth";
import { getStoreById } from "@/lib/stores";
import { AbandonedCheckoutAutomation } from "./AbandonedCheckoutAutomation";

export default async function AutomationsPage() {
  const user = await getSessionUser();
  if (!user) return null;
  const store = await getStoreById(user.activeStoreId, user.id);
  if (!store) return null;
  return (
    <div className={dashboardPageClass}>
      <h1 className="sr-only">Automations</h1>
      <p className={dashboardPageCopyClass}>
        Recover sales with automatic customer follow-ups.
      </p>
      <AbandonedCheckoutAutomation
        initialEnabled={store.abandonedCheckoutRemindersEnabled}
      />
    </div>
  );
}
