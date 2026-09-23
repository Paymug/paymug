"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
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
import {
  getAnalyticsVisitorId,
  identifyAnalyticsVisitor,
} from "@/components/visitor-analytics-tracker.utils";
import { formatProductPageMoney } from "./product-page.utils";
import type {
  CheckoutClientProps,
  CheckoutPricingPreview,
} from "./CheckoutClient.types";
import {
  ArrowClockwiseIcon,
  ArrowCounterClockwiseIcon,
} from "@phosphor-icons/react";
import {
  formatCustomCheckoutAmount,
  parseCustomCheckoutAmount,
} from "@/lib/custom-product-amount";
import { AbandonmentSurvey } from "@/components/AbandonmentSurvey";
import { DEFAULT_ABANDONMENT_QUESTION } from "@/lib/abandonment";

export function CheckoutClient({
  storeId,
  productId,
  productName,
  productPrice,
  defaultProductPrice,
  customAmountEnabled,
  allowNote,
  notePlaceholder,
  customAmount,
  custom,
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
  abandonmentEnabled = false,
  abandonmentQuestion,
  abandonmentOptions = [],
}: CheckoutClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const normalizedInitialDiscountCode = useMemo(
    () => initialDiscountCode?.trim().slice(0, 60).toUpperCase() || "",
    [initialDiscountCode],
  );
  const configurationKey = JSON.stringify(custom);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [noteVisible, setNoteVisible] = useState(false);
  const [note, setNote] = useState("");
  const checkoutCustom = useMemo(
    () =>
      allowNote && note.trim()
        ? { ...custom, note: note.trim().slice(0, 1000) }
        : custom,
    [allowNote, custom, note],
  );
  const appliedAmount = customAmount ?? defaultProductPrice;
  const [amount, setAmount] = useState(
    formatCustomCheckoutAmount(appliedAmount),
  );
  const [amountError, setAmountError] = useState<string | null>(null);
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
  const [orderCompleted, setOrderCompleted] = useState(false);
  const [completeError, setCompleteError] = useState<string | null>(null);
  const [pricing, setPricing] = useState<CheckoutPricingPreview>({
    subtotal: productPrice,
    discountAmount: 0,
    transactionFeeAmount: initialTransactionFeeAmount,
    total: productPrice + initialTransactionFeeAmount,
  });
  const discountRequestRef = useRef(0);
  const [emailPromptOpen, setEmailPromptOpen] = useState(false);
  const [promptEmail, setPromptEmail] = useState("");
  const [promptError, setPromptError] = useState<string | null>(null);
  const emailPromptResolveRef = useRef<((value: string | null) => void) | null>(
    null,
  );

  const emailOk = useMemo(() => isValidCheckoutEmail(email), [email]);
  const discountOk = !discountCode.trim() || discountStatus === "valid";
  const parsedAmount = useMemo(() => {
    if (!customAmountEnabled) return undefined;
    try {
      return parseCustomCheckoutAmount(amount);
    } catch {
      return undefined;
    }
  }, [amount, customAmountEnabled]);
  const amountOk =
    !customAmountEnabled ||
    (parsedAmount !== undefined && parsedAmount === appliedAmount);
  const paymentReady =
    emailOk && discountOk && discountStatus !== "checking" && amountOk;
  const paypalReady = discountOk && discountStatus !== "checking" && amountOk;
  const isFreePurchase = pricing.total === 0;
  const isForeverFreeSubscription =
    isSubscription && isFreePurchase && !discountPeriods;

  useEffect(() => {
    setAmount(formatCustomCheckoutAmount(appliedAmount));
    setAmountError(null);
  }, [appliedAmount]);

  function applyCustomAmount() {
    if (!customAmountEnabled) return;
    let nextAmount: number;
    try {
      const parsed = parseCustomCheckoutAmount(amount);
      if (parsed === undefined) throw new Error("Amount is required");
      nextAmount = parsed;
    } catch {
      setAmountError("Enter an amount between 0 and 10,000,000.00");
      return;
    }

    setAmountError(null);
    setAmount(formatCustomCheckoutAmount(nextAmount));
    if (nextAmount === appliedAmount) return;

    const next = new URLSearchParams(searchParams.toString());
    if (nextAmount === defaultProductPrice) next.delete("amount");
    else next.set("amount", formatCustomCheckoutAmount(nextAmount));
    router.replace(`${pathname}?${next.toString()}`, { scroll: false });
  }

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
        const preview = await fetchDiscountPreview(
          productId,
          code,
          customAmount,
          custom,
        );
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
    [custom, customAmount, initialTransactionFeeAmount, productId, productPrice],
  );

  useEffect(() => {
    if (!normalizedInitialDiscountCode) return;
    setDiscountVisible(true);
    setDiscountCode(normalizedInitialDiscountCode);
    void applyDiscountCode(normalizedInitialDiscountCode);
  }, [applyDiscountCode, normalizedInitialDiscountCode]);

  useEffect(() => {
    if (discountCode.trim() && discountStatus === "valid") {
      void applyDiscountCode(discountCode);
      return;
    }
    setPricing({
      subtotal: productPrice,
      discountAmount: 0,
      transactionFeeAmount: initialTransactionFeeAmount,
      total: productPrice + initialTransactionFeeAmount,
    });
  }, [
    configurationKey,
    initialTransactionFeeAmount,
    productPrice,
  ]);

  useEffect(() => {
    if (!affiliateRef) return;
    void trackAffiliateVisit(productId, affiliateRef);
  }, [productId, affiliateRef]);

  useEffect(() => {
    if (!emailOk) return;
    const trimmedEmail = email.trim().toLowerCase();
    const timeout = window.setTimeout(() => {
      void identifyAnalyticsVisitor({
        storeId,
        visitorId: getAnalyticsVisitorId(storeId),
        email: trimmedEmail,
      });
    }, 800);
    return () => window.clearTimeout(timeout);
  }, [email, emailOk, storeId]);

  const onSuccess = useCallback(
    (orderId: string) => {
      setOrderCompleted(true);
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
        customAmount,
        custom: checkoutCustom,
        customerEmail: email.trim(),
        customerName: name.trim() || undefined,
        discountCode:
          discountStatus === "valid"
            ? discountCode.trim() || undefined
            : undefined,
        affiliateCode: affiliateRef,
        marketingOptIn,
      });
      setOrderCompleted(true);
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
        custom: checkoutCustom,
        customerEmail: email.trim(),
        customerName: name.trim() || undefined,
        discountCode:
          discountStatus === "valid"
            ? discountCode.trim() || undefined
            : undefined,
        affiliateCode: affiliateRef,
        marketingOptIn,
      });
      setOrderCompleted(true);
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

  function requestCheckoutEmail(): Promise<string | null> {
    if (emailOk) return Promise.resolve(null);
    return new Promise((resolve) => {
      emailPromptResolveRef.current = resolve;
      setPromptEmail(email.trim());
      setPromptError(null);
      setEmailPromptOpen(true);
    });
  }

  function submitEmailPrompt() {
    const value = promptEmail.trim();
    if (!isValidCheckoutEmail(value)) {
      setPromptError("Enter a valid email");
      return;
    }
    const resolve = emailPromptResolveRef.current;
    emailPromptResolveRef.current = null;
    setEmail(value);
    setEmailPromptOpen(false);
    resolve?.(value);
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

        {allowNote && (
          <div className="space-y-2">
            {noteVisible ? (
              <div>
                <label
                  htmlFor="checkout-note"
                  className="text-sm font-medium text-foreground"
                >
                  Note
                </label>
                <textarea
                  id="checkout-note"
                  name="note"
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  maxLength={1000}
                  rows={3}
                  placeholder={
                    notePlaceholder?.trim() || "Add any details for this order"
                  }
                  className="mt-1.5 w-full rounded-xl border border-border bg-white px-3.5 py-2.5 text-sm text-foreground outline-none transition placeholder:text-stone-400 focus:border-accent focus:ring-3 focus:ring-accent/25"
                />
                <button
                  type="button"
                  onClick={() => {
                    setNoteVisible(false);
                    setNote("");
                  }}
                  className="mt-1 w-fit cursor-pointer text-xs text-muted hover:text-foreground"
                >
                  Remove note
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setNoteVisible(true)}
                className="w-fit cursor-pointer text-xs font-medium text-accent-dark hover:underline"
              >
                Add a note
              </button>
            )}
          </div>
        )}

        <label className="flex items-start gap-2 text-xs leading-5 text-muted">
          <input
            type="checkbox"
            checked={marketingOptIn}
            onChange={(event) => setMarketingOptIn(event.target.checked)}
            className="mt-1 accent-[var(--accent)]"
          />
          Send me product updates and offers from this store.
        </label>

        {customAmountEnabled ? null :
          !discountVisible ? (
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

        {customAmountEnabled && (
          <div className="space-y-1 pb-2">
            <Input
              label={`Pay what you want (${currency})`}
              type="number"
              name="customAmount"
              min="0"
              max="10000000"
              step="0.01"
              inputMode="decimal"
              value={amount}
              onChange={(event) => {
                setAmount(event.target.value);
                setAmountError(null);
              }}
              onBlur={applyCustomAmount}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  applyCustomAmount();
                }
              }}
              error={amountError || undefined}
              required
            />
            {!amountError && !amountOk && (
              <p className="text-xs text-muted">
                Press Enter or leave the field to apply this amount.
              </p>
            )}
          </div>
        )}

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
                custom={checkoutCustom}
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
                customAmount={customAmount}
                custom={checkoutCustom}
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
                customAmount={customAmount}
                custom={checkoutCustom}
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
                disabled={!paypalReady}
                onBeforeCapture={requestCheckoutEmail}
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

      {emailPromptOpen && (
        <div className="fixed inset-0 z-[110] grid place-items-center bg-[#222129]/45 p-4 backdrop-blur-[1px]">
          <div className="w-full max-w-sm rounded-2xl border border-[#e8e8ee] bg-white p-6 shadow-[0_24px_60px_rgba(25,24,31,0.25)]">
            <h2 className="text-lg font-semibold text-[#2a2a33]">
              Almost done
            </h2>
            <p className="mt-1 text-sm text-muted">
              Enter your email so we can send your purchase and receipt.
            </p>
            <form
              onSubmit={(event) => {
                event.preventDefault();
                submitEmailPrompt();
              }}
              className="mt-4 space-y-3"
            >
              <Input
                label="Email"
                type="email"
                value={promptEmail}
                autoFocus
                onChange={(event) => setPromptEmail(event.target.value)}
                placeholder="you@example.com"
                error={promptError || undefined}
              />
              <Button type="submit" className="w-full">
                Continue
              </Button>
            </form>
          </div>
        </div>
      )}

      {abandonmentEnabled && (
        <AbandonmentSurvey
          storeId={storeId}
          productId={productId}
          question={abandonmentQuestion?.trim() || DEFAULT_ABANDONMENT_QUESTION}
          options={abandonmentOptions}
          hasEmail={emailOk}
          email={email.trim() || undefined}
          completed={orderCompleted}
        />
      )}
    </div>
  );
}
