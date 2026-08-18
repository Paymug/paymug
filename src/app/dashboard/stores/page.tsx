import { dashboardPageClass, dashboardPageCopyClass } from "@/components/dashboard/dashboard.styles";
import { getSessionUser } from "@/lib/auth";
import { listStoresByUser } from "@/lib/stores";
import { StoresWorkspace } from "./StoresWorkspace";

export default async function StoresPage() {
  const user = await getSessionUser();
  if (!user) return null;
  return (
    <div className={dashboardPageClass}>
      <h1 className="sr-only">Stores</h1>
      <p className={dashboardPageCopyClass}>
        Create stores and choose which storefront you are managing.
      </p>
      <StoresWorkspace
        initialStores={await listStoresByUser(user.id)}
        activeStoreId={user.activeStoreId}
      />
    </div>
  );
}
