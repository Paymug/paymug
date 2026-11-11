import type {
  SepayCheckoutDetails,
  SepayCheckoutResponse,
} from "./SepayCheckoutButton.types";

export async function createSepayCheckout(
  details: SepayCheckoutDetails
): Promise<{ checkoutUrl: string; fields: Record<string, string | number> }> {
  const response = await fetch("/api/payments/sepay/create-session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(details),
  });
  const data = (await response.json()) as SepayCheckoutResponse;
  if (!response.ok || !data.checkoutUrl || !data.fields) {
    throw new Error(data.error || "Could not start SePay checkout");
  }
  return { checkoutUrl: data.checkoutUrl, fields: data.fields };
}

/** SePay verifies the signature against the posted field order. */
export function postSepayCheckoutForm(
  checkoutUrl: string,
  fields: Record<string, string | number>
) {
  const form = document.createElement("form");
  form.method = "POST";
  form.action = checkoutUrl;
  for (const [name, value] of Object.entries(fields)) {
    const input = document.createElement("input");
    input.type = "hidden";
    input.name = name;
    input.value = String(value);
    form.appendChild(input);
  }
  document.body.appendChild(form);
  form.submit();
}
