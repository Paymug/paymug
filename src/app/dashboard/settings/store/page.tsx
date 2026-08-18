import { StoreSettingsForm } from "@/components/dashboard/StoreSettingsForm";
import {
  dashboardPageClass,
  dashboardPageCopyClass,
} from "@/components/dashboard/dashboard.styles";
import { getSessionUser } from "@/lib/auth";
import { getActiveStoreForUser } from "@/lib/stores";

export default async function StoreSettingsPage() {
  const user = await getSessionUser();
  if (!user) return null;
  const store = await getActiveStoreForUser(user.id, user.activeStoreId);
  if (!store) return null;

  return (
    <div className={`${dashboardPageClass} !max-w-5xl`}>
      <h1 className="sr-only">Store settings</h1>
      <p className={dashboardPageCopyClass}>
        Customize how your active store appears to customers.
      </p>
      <StoreSettingsForm
        storeId={store.id}
        initialName={store.name}
        initialDescription={store.description}
        initialLogoImageUrl={store.logoImageUrl}
        initialCoverImageUrl={store.coverImageUrl}
        initialEmailFrom={store.emailFrom}
        initialEmailReplyTo={store.emailReplyTo}
        initialCurrency={store.currency}
        initialTransactionFeeType={store.transactionFeeType}
        initialTransactionFeeValue={store.transactionFeeValue}
      />
    </div>
  );
}
