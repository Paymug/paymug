import { CreateWebhookForm } from "@/components/dashboard/CreateWebhookForm";
import {
  dashboardPageClass,
  dashboardPageCopyClass,
} from "@/components/dashboard/dashboard.styles";

export default function NewWebhookPage() {
  return (
    <div className={dashboardPageClass}>
      <h1 className="sr-only">Create webhook</h1>
      <p className={dashboardPageCopyClass}>
        Add an authenticated endpoint and choose the events Paymug sends to it.
      </p>
      <CreateWebhookForm />
    </div>
  );
}
