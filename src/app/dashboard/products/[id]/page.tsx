import { notFound } from "next/navigation";
import Link from "next/link";
import { ProductForm } from "@/components/ProductForm";
import { dashboardPageClass } from "@/components/dashboard/dashboard.styles";
import { getSessionUser } from "@/lib/auth";
import { findProductById } from "@/lib/db";
import { getActiveStoreForUser } from "@/lib/stores";
import { ArrowSquareOutIcon } from "@phosphor-icons/react/ssr";

type Props = { params: Promise<{ id: string }> };

export default async function EditProductPage({ params }: Props) {
  const { id } = await params;
  const user = await getSessionUser();
  if (!user) return null;

  const product = await findProductById(id);
  if (!product || product.userId !== user.id) notFound();
  const store = await getActiveStoreForUser(user.id, user.activeStoreId);
  if (!store) notFound();

  return (
    <div className={`${dashboardPageClass} !max-w-6xl`}>
      <ProductForm
        product={product}
        storeCurrency={store.currency}
        storeTransactionFeeType={store.transactionFeeType}
        storeTransactionFeeValue={store.transactionFeeValue}
      />
    </div>
  );
}
