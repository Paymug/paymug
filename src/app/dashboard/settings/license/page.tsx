import { LicenseSettings } from "@/components/dashboard/LicenseSettings";
import { dashboardPageClass } from "@/components/dashboard/dashboard.styles";
import { getAppLicenseStatus } from "@/lib/app-license";

export default async function LicenseSettingsPage() {
  return (
    <div className={`${dashboardPageClass} !max-w-3xl pb-12`}>
      <h1 className="sr-only">License</h1>
      <LicenseSettings initialLicense={await getAppLicenseStatus()} />
    </div>
  );
}
