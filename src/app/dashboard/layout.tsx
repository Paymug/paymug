import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { DashboardNav } from "@/components/DashboardNav";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { DashboardTopbar } from "@/components/dashboard/DashboardTopbar";
import { getSessionUser } from "@/lib/auth";
import {
  hasUnreadNotifications,
  listNotifications,
} from "@/lib/notifications";
import { getPayPalEnvironmentState } from "@/lib/paypal-environment";
import { getRequestOrigin } from "@/lib/request-origin.utils";
import { getSetupChecklist } from "@/lib/setup-checklist";
import { reconcileExpiredGitHubLicenses } from "@/lib/github-access";
import { getActiveStoreForUser, listStoresByUser } from "@/lib/stores";
import { getAppLicenseStatus } from "@/lib/app-license";
import { DashboardProFeatureGate } from "@/components/dashboard/DashboardProFeatureGate";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const store = await getActiveStoreForUser(user.id, user.activeStoreId);
  if (!store) redirect("/setup/store");
  const stores = await listStoresByUser(user.id);
  await reconcileExpiredGitHubLicenses(user.id);
  const requestOrigin = getRequestOrigin(await headers());
  const [
    environmentState,
    notifications,
    hasUnread,
    setupChecklist,
    license,
  ] =
    await Promise.all([
      getPayPalEnvironmentState(
        user.id,
        user.environment,
        user.activeStoreId
      ),
      listNotifications(user.id, 12, user.environment),
      hasUnreadNotifications(user.id, user.environment),
      getSetupChecklist(
        user.id,
        user.storeName,
        user.storeSlug,
        requestOrigin,
        user.activeStoreId,
        user.environment
      ),
      getAppLicenseStatus(),
    ]);
  return (
    <DashboardShell
      nav={
        <DashboardNav
          storeName={user.storeName}
          stores={stores}
          activeStoreId={user.activeStoreId}
          userName={user.name}
          environment={environmentState.active}
          environmentAvailability={environmentState.availability}
          setupProgress={setupChecklist.progress}
          affiliatesEnabled={store.affiliatesEnabled}
          emailCampaignsEnabled={store.emailCampaignsEnabled}
          analyticsEnabled={store.analyticsEnabled}
        />
      }
      topbar={
        <DashboardTopbar
          initialNotifications={notifications}
          initialHasUnread={hasUnread}
        />
      }
    >
      <main className="relative row-start-3 min-w-0 overflow-x-clip px-4 pb-7 [&_a]:cursor-pointer [&_button]:cursor-pointer sm:px-8 lg:col-start-2 lg:row-start-2 lg:px-10 lg:pb-10">
        <DashboardProFeatureGate license={license}>
          {children}
        </DashboardProFeatureGate>
      </main>
    </DashboardShell>
  );
}
