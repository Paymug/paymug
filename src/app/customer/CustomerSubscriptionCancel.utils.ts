export async function cancelCustomerSubscription(
  subscriptionId: string,
): Promise<void> {
  const response = await fetch(
    `/api/customer/subscriptions/${encodeURIComponent(subscriptionId)}/cancel`,
    { method: "POST" },
  );
  if (response.ok) return;
  const body = (await response.json().catch(() => null)) as {
    error?: string;
  } | null;
  throw new Error(body?.error || "Could not cancel the subscription");
}
