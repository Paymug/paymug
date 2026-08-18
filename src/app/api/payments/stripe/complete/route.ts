import { completeStripeOrder } from "@/lib/stripe-order";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const orderId = url.searchParams.get("orderId");
  const sessionId = url.searchParams.get("session_id");
  if (!orderId || !sessionId) {
    return Response.redirect(new URL("/checkout/success", url.origin));
  }
  try {
    await completeStripeOrder(orderId, sessionId, request.url);
  } catch (error) {
    console.error(
      "stripe complete error:",
      error instanceof Error ? error.message : error
    );
  }
  return Response.redirect(
    new URL(`/checkout/success?orderId=${encodeURIComponent(orderId)}`, url.origin)
  );
}
