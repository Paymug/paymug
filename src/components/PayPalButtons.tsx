"use client";

import { useEffect, useRef, useState } from "react";
import { Alert, Spinner } from "./ui";
import { payPalButtonClass } from "./ui.styles";
import {
  captureCheckoutPayPalOrder,
  createCheckoutPayPalOrder,
  loadPayPalSdk,
} from "./paypal-buttons.utils";

import type {
  PayPalButtonActions,
  PayPalButtonsInstance,
  PayPalCardField,
  PayPalCardFieldsInstance,
  PayPalButtonsProps,
} from "./PayPalButtons.types";

export function PayPalButtons({
  productId,
  customerEmail,
  customerName,
  githubUsername,
  discountCode,
  affiliateCode,
  marketingOptIn,
  clientId,
  currency = "USD",
  disabled = false,
  onSuccess,
  onError,
}: PayPalButtonsProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const cardNameRef = useRef<HTMLDivElement>(null);
  const cardNumberRef = useRef<HTMLDivElement>(null);
  const cardExpiryRef = useRef<HTMLDivElement>(null);
  const cardCvvRef = useRef<HTMLDivElement>(null);
  const cardFieldsRef = useRef<PayPalCardFieldsInstance | null>(null);
  const buttonActionsRef = useRef<PayPalButtonActions | null>(null);
  const disabledRef = useRef(disabled);
  const [loading, setLoading] = useState(true);
  const [cardEligible, setCardEligible] = useState(false);
  const [cardSubmitting, setCardSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const orderIdRef = useRef<string | null>(null);
  const checkoutDetailsRef = useRef({
    productId,
    customerEmail,
    customerName,
    githubUsername,
    discountCode,
    affiliateCode,
    marketingOptIn,
  });
  const onSuccessRef = useRef(onSuccess);
  const onErrorRef = useRef(onError);

  checkoutDetailsRef.current = {
    productId,
    customerEmail,
    customerName,
    githubUsername,
    discountCode,
    affiliateCode,
    marketingOptIn,
  };
  onSuccessRef.current = onSuccess;
  onErrorRef.current = onError;
  disabledRef.current = disabled;

  useEffect(() => {
    if (disabled) {
      buttonActionsRef.current?.disable();
    } else {
      buttonActionsRef.current?.enable();
    }
  }, [disabled]);

  useEffect(() => {
    let cancelled = false;
    let buttons: PayPalButtonsInstance | null = null;
    const cardFields: PayPalCardField[] = [];

    async function load() {
      setLoading(true);
      setCardEligible(false);
      setError(null);
      cardFieldsRef.current = null;

      try {
        const paypal = await loadPayPalSdk(clientId, currency);
        if (cancelled || !containerRef.current) return;

        containerRef.current.innerHTML = "";

        async function createOrder() {
          if (disabledRef.current) {
            throw new Error("Complete the checkout details before paying");
          }
          const created = await createCheckoutPayPalOrder(
            checkoutDetailsRef.current
          );
          orderIdRef.current = created.orderId;
          return created.paypalOrderId;
        }

        async function approveOrder(data: { orderID: string }) {
          const completedOrderId = await captureCheckoutPayPalOrder(
            orderIdRef.current,
            data.orderID
          );
          onSuccessRef.current(completedOrderId);
        }

        function handleError(err: Error) {
          const message = err?.message || "PayPal error";
          setError(message);
          onErrorRef.current?.(message);
        }

        buttons = paypal.Buttons({
          style: {
            layout: "vertical",
            color: "gold",
            shape: "rect",
            label: "pay", // "Pay with PayPal"
            tagline: false,
            height: 48,
          },
          onInit: (
            _data: unknown,
            actions: PayPalButtonActions
          ) => {
            buttonActionsRef.current = actions;
            if (disabledRef.current) actions.disable();
          },
          createOrder,
          onApprove: approveOrder,
          onError: handleError,
          onCancel: () => {
            setError("Payment was cancelled.");
          },
        });

        await buttons.render(containerRef.current);
        if (!cancelled) setLoading(false);

        if (
          typeof paypal.CardFields === "function" &&
          cardNameRef.current &&
          cardNumberRef.current &&
          cardExpiryRef.current &&
          cardCvvRef.current
        ) {
          try {
            const instance = paypal.CardFields({
              style: {
                input: {
                  "font-size": "14px",
                  "font-family": "ui-sans-serif, system-ui, sans-serif",
                  "line-height": "20px",
                  padding: "11px 12px",
                  outline: "none",
                  background: "transparent",
                  color: "#27272f",
                  border: '1px solid #e8e3dc',
                  'border-radius': '12px'
                },
                ".invalid": { color: "#dc2626" },
              },
              createOrder,
              onApprove: approveOrder,
              onError: handleError,
            });
            if (instance.isEligible()) {
              cardFieldsRef.current = instance;
              const nameField = instance.NameField({
                placeholder: "Cardholder name (optional)",
              });
              const numberField = instance.NumberField({
                placeholder: "Card number",
              });
              const expiryField = instance.ExpiryField({
                placeholder: "MM / YY",
              });
              const cvvField = instance.CVVField({
                placeholder: "CVV",
              });
              cardFields.push(nameField, numberField, expiryField, cvvField);
              await Promise.all([
                nameField.render("#paypal-card-name"),
                numberField.render("#paypal-card-number"),
                expiryField.render("#paypal-card-expiry"),
                cvvField.render("#paypal-card-cvv"),
              ]);
              if (!cancelled) setCardEligible(true);
            }
          } catch {
            cardFieldsRef.current = null;
            if (!cancelled) setCardEligible(false);
          }
        }
      } catch (e) {
        if (!cancelled) {
          const msg = e instanceof Error ? e.message : "Failed to initialize PayPal";
          setError(msg);
          setLoading(false);
          onErrorRef.current?.(msg);
        }
      }
    }

    load();

    return () => {
      cancelled = true;
      buttonActionsRef.current = null;
      cardFieldsRef.current = null;
      buttons?.close().catch(() => {});
      for (const field of cardFields) {
        field.close?.().catch(() => {});
      }
    };
  }, [clientId, currency]);

  return (
    <div className="space-y-3">
      {loading && (
        <div className={`${payPalButtonClass} pointer-events-none opacity-70`}>
          <Spinner className="h-4 w-4" />
          <span>Loading PayPal…</span>
        </div>
      )}
      {error && <Alert>{error}</Alert>}
      <div className={cardEligible ? "space-y-3" : "hidden"}>
        <p className="text-sm font-medium">Pay with card</p>
        <div className="">
          <div
            id="paypal-card-name"
            ref={cardNameRef}
            // className="h-11 overflow-hidden rounded-lg border border-border bg-white"
          />
          <div
            id="paypal-card-number"
            ref={cardNumberRef}
            // className="h-11 overflow-hidden rounded-lg border border-border bg-white"
          />
          <div className="grid grid-cols-2">
            <div
              id="paypal-card-expiry"
              ref={cardExpiryRef}
              // className="h-11 overflow-hidden rounded-lg border border-border bg-white"
            />
            <div
              id="paypal-card-cvv"
              ref={cardCvvRef}
              // className="h-11 overflow-hidden rounded-lg border border-border bg-white"
            />
          </div>
        </div>
        <button
          type="button"
          disabled={disabled || cardSubmitting}
          onClick={async () => {
            setCardSubmitting(true);
            setError(null);
            try {
              await cardFieldsRef.current?.submit();
            } catch (err) {
              const message =
                err instanceof Error ? err.message : "Card payment failed";
              setError(message);
              onErrorRef.current?.(message);
            } finally {
              setCardSubmitting(false);
            }
          }}
          className="flex h-11 w-full items-center justify-center rounded-lg bg-[#27272f] px-4 text-sm font-semibold text-white transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-50"
        >
          {cardSubmitting ? "Processing…" : "Pay with card"}
        </button>
        <div className="flex items-center gap-3 py-1 text-sm uppercase text-muted">
          <span className="h-px flex-1 bg-border" />
          <span>or</span>
          <span className="h-px flex-1 bg-border" />
        </div>
      </div>
      <div ref={containerRef} className={loading ? "hidden" : "min-h-[48px]"} />
    </div>
  );
}
