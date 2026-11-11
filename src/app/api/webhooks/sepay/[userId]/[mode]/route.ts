import { getSepayCredentials } from "@/lib/payment-credentials";
import { matchesSepayIpnSecret, parseSepayIpn } from "@/lib/sepay";
import { completeSepayOrder, voidSepayOrder } from "@/lib/sepay-order";
import type { PayPalMode } from "@/lib/types";
import type { SepayWebhookRouteContext } from "./route.types";

export async function POST(
  request: Request,
  { params }: SepayWebhookRouteContext
) {
  const { userId, mode: rawMode } = await params;
  if (rawMode !== "sandbox" && rawMode !== "live") {
    return Response.json({ error: "Invalid mode" }, { status: 400 });
  }
  const connection = await getSepayCredentials(userId, rawMode as PayPalMode);
  if (!connection?.ipnSecret) {
    return Response.json(
      { error: "SePay IPN is not configured" },
      { status: 404 }
    );
  }
  if (!matchesSepayIpnSecret(request.headers.get("x-secret-key"), connection.ipnSecret)) {
    return Response.json({ error: "Invalid SePay IPN secret" }, { status: 401 });
  }
  try {
    const payload = parseSepayIpn(await request.text());
    if (payload.notification_type === "ORDER_PAID") {
      await completeSepayOrder(payload, userId, rawMode, request.url);
    } else if (payload.notification_type === "TRANSACTION_VOID") {
      await voidSepayOrder(payload, userId, rawMode);
    }
    return Response.json({ success: true });
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Could not process SePay IPN",
      },
      { status: 400 }
    );
  }
}
