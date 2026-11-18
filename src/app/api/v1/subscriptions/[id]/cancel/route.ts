import { authorizeApiKey } from "@/lib/api-keys";
import { findUserById } from "@/lib/db";
import {
  cancelSubscriptionForOwner,
  toSubscriptionCancelResponse,
} from "@/lib/subscription-cancel";
import { jsonError } from "@/lib/utils";
import type { SubscriptionCancelRouteContext } from "./route.types";

/** Cancels the subscription at its payment provider. Idempotent. */
export async function POST(
  req: Request,
  { params }: SubscriptionCancelRouteContext
) {
  const auth = await authorizeApiKey(req, "subscriptions", "write");
  if ("error" in auth) return auth.error;
  const user = await findUserById(auth.apiKey.userId);
  if (!user) return jsonError("Unauthorized", 401);
  const { id } = await params;
  try {
    const subscription = await cancelSubscriptionForOwner({
      id,
      userId: user.id,
      environment: user.environment,
      source: "api",
      requestUrl: req.url,
    });
    return Response.json({ subscription });
  } catch (error) {
    return toSubscriptionCancelResponse(error);
  }
}
