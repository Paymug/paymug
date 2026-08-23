import { CreateWebhookForm } from "@/components/dashboard/CreateWebhookForm";
import {
  dashboardPageClass,
  dashboardPageCopyClass,
} from "@/components/dashboard/dashboard.styles";
import { getSessionUser } from "@/lib/auth";
import { listProductsByUser } from "@/lib/db";

export default async function NewWebhookPage() {
  const user = await getSessionUser();
  if (!user) return null;
  const products = await listProductsByUser(
    user.id,
    user.activeStoreId,
    user.environment,
  );

  return (
    <div className={dashboardPageClass}>
      <h1 className="sr-only">Create webhook</h1>
      <p className={dashboardPageCopyClass}>
        Add an endpoint and choose the product event Paymug sends to it.
      </p>
      <CreateWebhookForm
        productOptions={products.map((product) => ({
          label: product.name,
          value: product.id,
        }))}
      />
    </div>
  );
}
