import { getCustomerSession } from "@/lib/customer-auth";
import {
  cancelSubscriptionForCustomer,
  toSubscriptionCancelResponse,
} from "@/lib/subscription-cancel";
import { jsonError } from "@/lib/utils";
import type { SubscriptionCancelRouteContext } from "./route.types";

export async function POST(
  req: Request,
  { params }: SubscriptionCancelRouteContext
) {
  const customer = await getCustomerSession();
  if (!customer) return jsonError("Unauthorized", 401);
  const { id } = await params;
  try {
    const subscription = await cancelSubscriptionForCustomer({
      id,
      email: customer.email,
      requestUrl: req.url,
    });
    return Response.json({ status: subscription.status });
  } catch (error) {
    return toSubscriptionCancelResponse(error);
  }
}
