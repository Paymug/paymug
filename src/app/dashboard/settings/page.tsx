import { getSessionUser } from "@/lib/auth";
import { GeneralSettingsForm } from "@/components/dashboard/GeneralSettingsForm";
import { GrowthSettingsForm } from "@/components/dashboard/GrowthSettingsForm";
import { getStoreById } from "@/lib/stores";

export default async function SettingsPage() {
  const user = await getSessionUser();
  if (!user) return null;
  const store = await getStoreById(user.activeStoreId, user.id);
  if (!store) return null;

  return (
    <div className="mx-auto w-full max-w-xl pb-12">
      <h1 className="sr-only">Settings</h1>
      <section className="py-8 text-center sm:py-12">
        <p className="text-sm font-semibold uppercase tracking-wider text-accent-hover">
          General settings
        </p>
        <h2 className="mt-3 text-3xl font-semibold tracking-tight text-[#333]">
          Manage your account and store features
        </h2>
        <p className="mx-auto mt-3 max-w-2xl text-base leading-relaxed text-[#74748f]">
          Update your account profile and choose the growth tools available for
          your active store.
        </p>
      </section>

      <GeneralSettingsForm
        name={user.name}
        email={user.email}
        memberSince={user.createdAt.slice(0, 10)}
      />
      <GrowthSettingsForm
        storeId={store.id}
        initialAffiliatesEnabled={store.affiliatesEnabled}
        initialAffiliateCommissionType={store.affiliateCommissionType}
        initialAffiliateCommissionValue={store.affiliateCommissionValue}
        initialAffiliateCommissionDuration={store.affiliateCommissionDuration}
        initialAffiliateAttributionModel={store.affiliateAttributionModel}
        initialEmailCampaignsEnabled={store.emailCampaignsEnabled}
      />
    </div>
  );
}
