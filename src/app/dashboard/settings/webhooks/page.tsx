import { WebhooksWorkspace } from "@/components/dashboard/WebhooksWorkspace";
import {
  dashboardPageClass,
  dashboardPageCopyClass,
} from "@/components/dashboard/dashboard.styles";

export default function WebhooksPage() {
  return (
    <div className={dashboardPageClass}>
      <h1 className="sr-only">Webhooks</h1>
      <p className={dashboardPageCopyClass}>
        Send signed event notifications to your application and inspect each
        delivery response.
      </p>
      <WebhooksWorkspace />
    </div>
  );
}
