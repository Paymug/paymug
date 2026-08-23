import { notFound } from "next/navigation";
import { EditWebhookForm } from "@/components/dashboard/EditWebhookForm";
import {
  dashboardPageClass,
  dashboardPageCopyClass,
} from "@/components/dashboard/dashboard.styles";
import { getSessionUser } from "@/lib/auth";
import { listProductsByUser } from "@/lib/db";
import { getOutboundWebhook } from "@/lib/outbound-webhooks";
import type { EditWebhookPageProps } from "./page.types";

export default async function EditWebhookPage({
  params,
}: EditWebhookPageProps) {
  const user = await getSessionUser();
  if (!user) return null;
  const { id } = await params;
  const [webhook, products] = await Promise.all([
    getOutboundWebhook(
      id,
      user.id,
      user.activeStoreId,
      user.environment,
    ),
    listProductsByUser(user.id, user.activeStoreId, user.environment),
  ]);
  if (!webhook) notFound();

  return (
    <div className={dashboardPageClass}>
      <h1 className="sr-only">Edit webhook</h1>
      <p className={dashboardPageCopyClass}>
        Update the endpoint, outbound authentication, product, and event.
      </p>
      <EditWebhookForm
        webhook={webhook}
        productOptions={products.map((product) => ({
          label: product.name,
          value: product.id,
        }))}
      />
    </div>
  );
}
