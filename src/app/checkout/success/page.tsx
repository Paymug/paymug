import Link from "next/link";
import { Logo } from "@/components/Logo";
import { ProductDescription } from "@/components/ProductDescription";
import {
  buttonBaseClass,
  buttonVariantClasses,
  cardClass,
} from "@/components/ui.styles";
import { getOrderLicense } from "@/lib/commerce-features";
import { findOrderById, findProductById } from "@/lib/db";
import { formatMoney } from "@/lib/format";
import {
  formatProductFileSize,
  getProductFileDownloadUrl,
} from "@/lib/product-files.utils";
import { PendingCaptureClient } from "./PendingCaptureClient";
import { getLicenseEntitlementSummary } from "@/lib/license-entitlements";

type Props = {
  searchParams: Promise<{ orderId?: string }>;
};

export default async function CheckoutSuccessPage({ searchParams }: Props) {
  const { orderId } = await searchParams;

  if (!orderId) {
    return (
      <Shell>
        <h1 className="text-2xl font-bold">Missing order</h1>
        <p className="mt-2 text-muted">No order ID was provided.</p>
        <Link
          href="/"
          className={`${buttonBaseClass} ${buttonVariantClasses.primary} mt-6`}
        >
          Home
        </Link>
      </Shell>
    );
  }

  const order = await findOrderById(orderId);
  if (!order) {
    return (
      <Shell>
        <h1 className="text-2xl font-bold">Order not found</h1>
        <Link
          href="/"
          className={`${buttonBaseClass} ${buttonVariantClasses.primary} mt-6`}
        >
          Home
        </Link>
      </Shell>
    );
  }

  // PayPal may redirect here via return_url before Smart Buttons capture finishes
  if (order.status === "pending" && order.paypalOrderId) {
    return (
      <Shell>
        <PendingCaptureClient
          orderId={order.id}
          paypalOrderId={order.paypalOrderId}
          productName={order.productName}
        />
      </Shell>
    );
  }

  if (order.status !== "paid") {
    return (
      <Shell>
        <h1 className="text-2xl font-bold">Payment incomplete</h1>
        <p className="mt-2 text-muted">
          This order is currently <strong>{order.status}</strong>.
        </p>
        <Link
          href={`/buy/${order.productId}`}
          className={`${buttonBaseClass} ${buttonVariantClasses.primary} mt-6`}
        >
          Try again
        </Link>
      </Shell>
    );
  }

  const [product, license] = await Promise.all([
    findProductById(order.productId),
    getOrderLicense(order.userId, order.id),
  ]);
  const licenseEntitlement = license
    ? getLicenseEntitlementSummary(license)
    : undefined;
  const currentUpdatesIncluded = Boolean(
    licenseEntitlement?.perpetual && licenseEntitlement.updatesActive
  );
  const currentProductFiles = product?.productFiles || [];
  const productFiles = currentUpdatesIncluded
    ? [
        ...currentProductFiles,
        ...order.productFiles.filter(
          (orderFile) =>
            !currentProductFiles.some(
              (currentFile) => currentFile.id === orderFile.id
            )
        ),
      ]
    : order.productFiles.length
      ? order.productFiles
      : currentProductFiles;
  const deliveryContent = currentUpdatesIncluded
    ? product?.deliveryContent || order.deliveryContent
    : order.deliveryContent || product?.deliveryContent;

  return (
    <Shell>
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-2xl">
        ✓
      </div>
      <h1 className="mt-4 text-2xl font-bold tracking-tight">You&apos;re all set!</h1>
      <p className="mt-2 text-muted">
        Thanks for purchasing <strong className="text-foreground">{order.productName}</strong>.
      </p>

      <div className={`${cardClass} mt-8 w-full max-w-md p-6 text-left`}>
        <Row label="Amount" value={formatMoney(order.amount, order.currency)} />
        <Row label="Email" value={order.customerEmail} />
        <Row label="Order ID" value={order.id.slice(0, 8) + "…"} />
        {order.paidAt && (
          <Row label="Paid at" value={new Date(order.paidAt).toLocaleString()} />
        )}
      </div>

      {deliveryContent && (
        <div className={`${cardClass} mt-4 w-full max-w-md border-accent/40 bg-accent-soft p-6 text-left`}>
          <h2 className="font-semibold">Your delivery</h2>
          <ProductDescription
            value={deliveryContent}
            className="mt-3"
          />
        </div>
      )}

      {!!productFiles.length && (
        <div className={`${cardClass} mt-4 w-full max-w-md border-accent/40 bg-accent-soft p-6 text-left`}>
          <h2 className="font-semibold">Your downloads</h2>
          <div className="mt-3 space-y-2">
            {productFiles.map((file) => (
              <a
                key={file.id}
                href={getProductFileDownloadUrl(order.id, file.id)}
                className="flex items-center justify-between gap-3 rounded-lg bg-white px-3 py-2 text-sm font-medium hover:ring-1 hover:ring-accent"
              >
                <span className="min-w-0 truncate">{file.name}</span>
                <span className="shrink-0 text-xs text-muted">
                  {formatProductFileSize(file.size)}
                </span>
              </a>
            ))}
          </div>
        </div>
      )}

      {license && (
        <div className={`${cardClass} mt-4 w-full max-w-md border-accent/40 bg-accent-soft p-6 text-left`}>
          <h2 className="font-semibold">Your license key</h2>
          <code className="mt-3 block break-all rounded-lg bg-white px-3 py-2 text-sm">
            {license.title}
          </code>
          {licenseEntitlement?.perpetual && (
            <div className="mt-3 text-sm leading-6 text-muted">
              <p className="font-medium text-foreground">Lifetime use included</p>
              <p>
                {licenseEntitlement.updatesExpireAt
                  ? `Updates included through ${new Date(licenseEntitlement.updatesExpireAt).toLocaleDateString()}.`
                  : "Updates are currently included."}
              </p>
            </div>
          )}
        </div>
      )}

      <Link
        href="/customer/login"
        className={`${buttonBaseClass} ${buttonVariantClasses.outline} mt-6`}
      >
        Open customer portal
      </Link>

      {product?.githubRepoOwner &&
        product.githubRepoName &&
        order.githubUsername && (
          <div className={`${cardClass} mt-4 w-full max-w-md p-6 text-left`}>
            <h2 className="font-semibold">GitHub repository access</h2>
            <p className="mt-2 text-sm text-muted">
              Repository:{" "}
              <strong className="text-foreground">
                {product.githubRepoOwner}/{product.githubRepoName}
              </strong>
            </p>
            <p className="mt-1 text-sm text-muted">
              GitHub account:{" "}
              <strong className="text-foreground">
                @{order.githubUsername}
              </strong>
            </p>
            <p className="mt-3 text-sm">
              {order.githubAccessStatus === "invited"
                ? "GitHub sent a repository invitation. Accept it from your GitHub notifications or email."
                : order.githubAccessStatus === "existing"
                  ? "This GitHub account already has repository access."
                  : order.githubAccessStatus === "error"
                    ? "Payment succeeded, but repository access could not be granted. Contact the seller."
                    : "Repository access is being prepared."}
            </p>
          </div>
        )}

      <p className="mt-8 text-sm text-muted">
        A purchase confirmation was sent to {order.customerEmail}.
      </p>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center px-4 py-12">
      <Logo />
      <div className="mt-10 flex w-full max-w-lg flex-col items-center text-center">
        {children}
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 border-b border-border py-2 text-sm last:border-0">
      <span className="text-muted">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
