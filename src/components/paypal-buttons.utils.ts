import type {
  PayPalCheckoutDetails,
  PayPalCreatedOrder,
  PayPalNamespace,
} from "./PayPalButtons.types";

let paypalSdkPromise: Promise<PayPalNamespace> | undefined;
let paypalSdkSource: string | undefined;

export function getPayPalNamespace(): PayPalNamespace | undefined {
  return (window as unknown as { paypal?: PayPalNamespace }).paypal;
}

export async function loadPayPalSdk(
  clientId: string,
  currency: string
): Promise<PayPalNamespace> {
  const source = `https://www.paypal.com/sdk/js?client-id=${encodeURIComponent(clientId)}&currency=${encodeURIComponent(currency.toUpperCase())}&intent=capture&components=buttons,card-fields`;
  const currentNamespace = getPayPalNamespace();
  const existingScript = document.getElementById(
    "paypal-sdk"
  ) as HTMLScriptElement | null;
  if (
    existingScript?.src === source &&
    typeof currentNamespace?.Buttons === "function"
  ) {
    existingScript.dataset.loaded = "true";
    paypalSdkSource = source;
    return currentNamespace;
  }
  if (
    paypalSdkSource === source &&
    typeof currentNamespace?.Buttons === "function"
  ) {
    return currentNamespace;
  }
  if (paypalSdkPromise && paypalSdkSource === source) {
    return paypalSdkPromise;
  }

  if (existingScript && existingScript.src !== source) {
    existingScript.remove();
    delete (window as unknown as { paypal?: PayPalNamespace }).paypal;
  }

  paypalSdkSource = source;
  paypalSdkPromise = new Promise<PayPalNamespace>((resolve, reject) => {
    const script =
      (document.getElementById("paypal-sdk") as HTMLScriptElement | null) ||
      document.createElement("script");

    function resolveNamespace() {
      const paypal = getPayPalNamespace();
      if (!paypal || typeof paypal.Buttons !== "function") {
        reject(new Error("PayPal SDK loaded without the Buttons component"));
        return;
      }
      resolve(paypal);
    }

    if (script.dataset.loaded === "true") {
      resolveNamespace();
      return;
    }

    script.addEventListener("load", resolveNamespace, { once: true });
    script.addEventListener(
      "error",
      () => reject(new Error("Failed to load PayPal SDK")),
      { once: true }
    );
    if (!script.id) {
      script.id = "paypal-sdk";
      script.src = source;
      script.async = true;
      script.addEventListener(
        "load",
        () => {
          script.dataset.loaded = "true";
        },
        { once: true }
      );
      document.body.appendChild(script);
    }
  }).catch((error) => {
    paypalSdkPromise = undefined;
    throw error;
  });

  return paypalSdkPromise;
}

export async function createCheckoutPayPalOrder(
  checkoutDetails: PayPalCheckoutDetails
): Promise<PayPalCreatedOrder> {
  const response = await fetch("/api/payments/paypal/create-order", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(checkoutDetails),
  });
  const data = (await response.json()) as {
    error?: string;
    orderId?: string;
    paypalOrderId?: string;
  };
  if (!response.ok || !data.orderId || !data.paypalOrderId) {
    throw new Error(data.error || "Could not create order");
  }
  return {
    orderId: data.orderId,
    paypalOrderId: data.paypalOrderId,
  };
}

export async function captureCheckoutPayPalOrder(
  orderId: string | null,
  paypalOrderId: string
): Promise<string> {
  if (!orderId) throw new Error("Checkout order is missing");
  const response = await fetch("/api/payments/paypal/capture-order", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ orderId, paypalOrderId }),
  });
  const data = (await response.json()) as {
    error?: string;
    order?: { id?: string };
  };
  if (!response.ok || !data.order?.id) {
    throw new Error(data.error || "Payment capture failed");
  }
  return data.order.id;
}
