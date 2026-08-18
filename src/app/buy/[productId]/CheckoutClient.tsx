"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { PayPalButtons } from "@/components/PayPalButtons";
import { StripeCheckoutButton } from "@/components/StripeCheckoutButton";
import { Button, Input } from "@/components/ui";
import {
  completeFreePurchase,
  fetchDiscountPreview,
  isValidCheckoutEmail,
  startPayPalSubscriptionCheckout,
  trackAffiliateVisit,
} from "./checkout-client.utils";
import { formatProductPageMoney } from "./product-page.utils";
import type {
  CheckoutClientProps,
  CheckoutPricingPreview,
} from "./CheckoutClient.types";
import {
  ArrowClockwiseIcon,
  ArrowCounterClockwiseIcon,
} from "@phosphor-icons/react";

export function CheckoutClient({
  productId,
  productName,
  productPrice,
  affiliateRef,
  initialDiscountCode,
  initialTransactionFeeAmount,
  paypalClientId,
  stripeEnabled,
  mode,
  currency,
  isSubscription = false,
  billingSummary,
  priceSuffix = "",
}: CheckoutClientProps) {
  const router = useRouter();
  const normalizedInitialDiscountCode = useMemo(
    () => initialDiscountCode?.trim().slice(0, 60).toUpperCase() || "",
    [initialDiscountCode],
  );
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [discountVisible, setDiscountVisible] = useState(
    Boolean(normalizedInitialDiscountCode),
  );
  const [discountCode, setDiscountCode] = useState(
    normalizedInitialDiscountCode,
  );
  const [marketingOptIn, setMarketingOptIn] = useState(true);
  const [touched, setTouched] = useState(false);
  const [discountStatus, setDiscountStatus] = useState<
    "idle" | "checking" | "valid" | "invalid"
  >(normalizedInitialDiscountCode ? "checking" : "idle");
  const [discountError, setDiscountError] = useState<string | null>(null);
  const [discountPeriods, setDiscountPeriods] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [completeError, setCompleteError] = useState<string | null>(null);
  const [pricing, setPricing] = useState<CheckoutPricingPreview>({
    subtotal: productPrice,
    discountAmount: 0,
    transactionFeeAmount: initialTransactionFeeAmount,
    total: productPrice + initialTransactionFeeAmount,
  });
  const discountRequestRef = useRef(0);

  const emailOk = useMemo(() => isValidCheckoutEmail(email), [email]);
  const discountOk = !discountCode.trim() || discountStatus === "valid";
  const paymentReady =
    emailOk && discountOk && discountStatus !== "checking";
  const isFreePurchase = pricing.total === 0;
  const isForeverFreeSubscription =
    isSubscription && isFreePurchase && !discountPeriods;

  const applyDiscountCode = useCallback(
    async (value: string) => {
      const code = value.trim();
      const requestId = ++discountRequestRef.current;
      if (!code) {
        setDiscountStatus("idle");
        setDiscountError(null);
        setDiscountPeriods(null);
        setPricing({
          subtotal: productPrice,
          discountAmount: 0,
          transactionFeeAmount: initialTransactionFeeAmount,
          total: productPrice + initialTransactionFeeAmount,
        });
        return;
      }

      setDiscountStatus("checking");
      setDiscountError(null);
      try {
        const preview = await fetchDiscountPreview(productId, code);
        if (requestId !== discountRequestRef.current) return;
        setDiscountCode(preview.code || code);
        setPricing(preview);
        setDiscountPeriods(preview.subscriptionPeriods || null);
        setDiscountStatus("valid");
      } catch (error) {
        if (requestId !== discountRequestRef.current) return;
        setDiscountStatus("invalid");
        setDiscountPeriods(null);
        setDiscountError(
          error instanceof Error ? error.message : "Discount code is invalid",
        );
        setPricing({
          subtotal: productPrice,
          discountAmount: 0,
          transactionFeeAmount: initialTransactionFeeAmount,
          total: productPrice + initialTransactionFeeAmount,
        });
      }
    },
    [initialTransactionFeeAmount, productId, productPrice],
  );

  useEffect(() => {
    if (!normalizedInitialDiscountCode) return;
    setDiscountVisible(true);
    setDiscountCode(normalizedInitialDiscountCode);
    void applyDiscountCode(normalizedInitialDiscountCode);
  }, [applyDiscountCode, normalizedInitialDiscountCode]);

  useEffect(() => {
    if (!affiliateRef) return;
    void trackAffiliateVisit(productId, affiliateRef);
  }, [productId, affiliateRef]);

  const onSuccess = useCallback(
    (orderId: string) => {
      router.push(`/checkout/success?orderId=${orderId}`);
    },
    [router],
  );

  async function onComplete() {
    setSubmitting(true);
    setCompleteError(null);
    try {
      const { order } = await completeFreePurchase({
        productId,
        customerEmail: email.trim(),
        customerName: name.trim() || undefined,
        discountCode:
          discountStatus === "valid"
            ? discountCode.trim() || undefined
            : undefined,
        affiliateCode: affiliateRef,
        marketingOptIn,
      });
      router.push(`/checkout/success?orderId=${order.id}`);
    } catch (error) {
      setCompleteError(
        error instanceof Error ? error.message : "Could not complete purchase",
      );
      setSubmitting(false);
    }
  }

  async function onSubscribeWithPayPal() {
    setSubmitting(true);
    setCompleteError(null);
    try {
      const approvalUrl = await startPayPalSubscriptionCheckout({
        productId,
        customerEmail: email.trim(),
        customerName: name.trim() || undefined,
        discountCode:
          discountStatus === "valid"
            ? discountCode.trim() || undefined
            : undefined,
        affiliateCode: affiliateRef,
        marketingOptIn,
      });
      window.location.assign(approvalUrl);
    } catch (error) {
      setCompleteError(
        error instanceof Error
          ? error.message
          : "Could not start subscription",
      );
      setSubmitting(false);
    }
  }

  return (
    <div className="divide-y divide-border">
      <section className="space-y-4 p-6">
        <Input
          label="Email"
          type="email"
          name="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onBlur={() => setTouched(true)}
          placeholder="you@example.com"
          required
          error={
            touched && !emailOk
              ? email.trim()
                ? "Enter a valid email"
                : "Email is required"
              : undefined
          }
        />
        <Input
          label="Name (optional)"
          name="name"
          autoComplete="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Jane Doe"
        />

        <label className="flex items-start gap-2 text-xs leading-5 text-muted">
          <input
            type="checkbox"
            checked={marketingOptIn}
            onChange={(event) => setMarketingOptIn(event.target.checked)}
            className="mt-1 accent-[var(--accent)]"
          />
          Send me product updates and offers from this store.
        </label>

        {!discountVisible ? (
          <button
            type="button"
            onClick={() => setDiscountVisible(true)}
            className="w-fit cursor-pointer text-xs font-medium text-accent-dark hover:underline"
          >
            Add discount code
          </button>
        ) : (
          <div className="space-y-2">
            <Input
              label="Discount code"
              name="discountCode"
              value={discountCode}
              onChange={(event) => {
                discountRequestRef.current += 1;
                setDiscountCode(event.target.value.toUpperCase());
                setDiscountStatus("idle");
                setDiscountError(null);
                setDiscountPeriods(null);
                setPricing({
                  subtotal: productPrice,
                  discountAmount: 0,
                  transactionFeeAmount: initialTransactionFeeAmount,
                  total: productPrice + initialTransactionFeeAmount,
                });
              }}
              onBlur={() => void applyDiscountCode(discountCode)}
              placeholder="WELCOME10"
              error={discountError || undefined}
            />
            {discountStatus === "checking" && (
              <p className="flex items-center gap-2 text-sm text-muted">
                <ArrowClockwiseIcon className="animate-spin" size={14} />
                Checking discount code…
              </p>
            )}
            {discountStatus === "valid" && (
              <p className="text-sm text-emerald-600">
                Discount applied
                {isSubscription && discountPeriods
                  ? ` for the first ${discountPeriods} billing ${discountPeriods === 1 ? "period" : "periods"}`
                  : ""}
                .
              </p>
            )}
          </div>
        )}
      </section>

      <section className="space-y-3 p-6">
        <h3 className="text-sm font-semibold tracking-wide text-foreground">
          {isSubscription ? "Subscription summary" : "Order summary"}
        </h3>
        {billingSummary && (
          <p className="text-xs text-muted">{billingSummary}</p>
        )}
        <div className="space-y-2 text-sm border-b border-border">
          <div className="flex items-center justify-between gap-4">
            <span className="text-muted">{productName}</span>
            <span>
              {formatProductPageMoney(pricing.subtotal, currency)}
              {priceSuffix}
            </span>
          </div>
          {pricing.discountAmount > 0 && (
            <div className="flex items-center justify-between gap-4 text-emerald-600">
              <span>
                Discount
                {isSubscription && discountPeriods
                  ? ` · first ${discountPeriods} ${discountPeriods === 1 ? "period" : "periods"}`
                  : ""}
              </span>
              <span>
                -{formatProductPageMoney(pricing.discountAmount, currency)}
              </span>
            </div>
          )}
          {pricing.transactionFeeAmount > 0 && (
            <div className="flex items-center justify-between gap-4">
              <span className="text-muted">Transaction fee</span>
              <span>
                {formatProductPageMoney(
                  pricing.transactionFeeAmount,
                  currency,
                )}
              </span>
            </div>
          )}
          <div className="flex items-center justify-between gap-4 py-3 font-semibold">
            <span>{isSubscription ? "Due per period" : "Total"}</span>
            <span>
              {formatProductPageMoney(pricing.total, currency)}
              {priceSuffix}
            </span>
          </div>
        </div>

        {completeError && (
          <p className="rounded-lg bg-[#fdf0f0] px-3 py-2 text-sm text-[#b3403a]">
            {completeError}
          </p>
        )}

        {isFreePurchase && (!isSubscription || isForeverFreeSubscription) ? (
          <div className="space-y-2">
            <Button
              type="button"
              className="w-full bg-accent hover:bg-accent-hover"
              disabled={!paymentReady || submitting}
              onClick={onComplete}
            >
              {submitting
                ? "Completing…"
                : isForeverFreeSubscription
                  ? "Start free subscription"
                  : "Complete"}
            </Button>
            {!paymentReady && (
              <p className="text-center text-xs text-muted">
                Enter your details above to complete
                {isForeverFreeSubscription ? " the subscription" : " the purchase"}.
              </p>
            )}
          </div>
        ) : isSubscription ? (
          <div className="space-y-2">
            {stripeEnabled && (
              <StripeCheckoutButton
                productId={productId}
                customerEmail={email.trim()}
                customerName={name.trim() || undefined}
                discountCode={
                  discountStatus === "valid"
                    ? discountCode.trim() || undefined
                    : undefined
                }
                marketingOptIn={marketingOptIn}
                disabled={!paymentReady || submitting}
                label="Subscribe with Stripe"
              />
            )}
            {stripeEnabled && paypalClientId && (
              <div className="flex items-center gap-3 py-1 text-xs uppercase tracking-wide text-muted">
                <span className="h-px flex-1 bg-border" />
                or
                <span className="h-px flex-1 bg-border" />
              </div>
            )}
            {paypalClientId && (
              <Button
                type="button"
                className="w-full bg-accent hover:bg-accent-hover"
                disabled={!paymentReady || submitting}
                onClick={() => void onSubscribeWithPayPal()}
              >
                {submitting ? "Redirecting to PayPal…" : "Subscribe with PayPal"}
              </Button>
            )}
            {!stripeEnabled && !paypalClientId && (
              <p className="rounded-lg bg-[#f7f7f8] px-3 py-2 text-sm text-muted">
                This seller hasn&apos;t connected a payment method yet. A valid
                forever-free discount can still complete without payment.
              </p>
            )}
            {!paymentReady && (
              <p className="text-center text-xs text-muted">
                Enter your details above to start the subscription.
              </p>
            )}
          </div>
        ) : (
          <>
            {stripeEnabled && (
              <StripeCheckoutButton
                productId={productId}
                customerEmail={email.trim()}
                customerName={name.trim() || undefined}
                discountCode={
                  discountStatus === "valid"
                    ? discountCode.trim() || undefined
                    : undefined
                }
                marketingOptIn={marketingOptIn}
                disabled={!paymentReady}
              />
            )}
            {stripeEnabled && paypalClientId && (
              <div className="flex items-center gap-3 py-1 text-xs uppercase tracking-wide text-muted">
                <span className="h-px flex-1 bg-border" />
                or
                <span className="h-px flex-1 bg-border" />
              </div>
            )}
            {paypalClientId && (
              <PayPalButtons
                productId={productId}
                customerEmail={email.trim()}
                customerName={name.trim() || undefined}
                discountCode={
                  discountStatus === "valid"
                    ? discountCode.trim() || undefined
                    : undefined
                }
                marketingOptIn={marketingOptIn}
                clientId={paypalClientId}
                mode={mode}
                currency={currency}
                disabled={!paymentReady}
                onSuccess={onSuccess}
              />
            )}
            {!stripeEnabled && !paypalClientId && (
              <p className="rounded-lg bg-[#f7f7f8] px-3 py-2 text-sm text-muted">
                This seller hasn&apos;t connected a payment method yet. A valid
                free discount can still complete without payment.
              </p>
            )}
          </>
        )}
        {/* {!paymentReady && (
          <p className="text-center text-sm text-muted">
            Complete the required details and apply or remove any discount code
            to enable payment.
          </p>
        )} */}
      </section>
    </div>
  );
}
