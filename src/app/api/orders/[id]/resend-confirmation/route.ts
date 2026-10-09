import { getSessionUser } from "@/lib/auth";
import { getOrderLicense } from "@/lib/commerce-features";
import { findOrderById, findProductById } from "@/lib/db";
import { resendPurchaseConfirmationEmail } from "@/lib/transactional-emails";
import { jsonError } from "@/lib/utils";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(request: Request, ctx: Ctx) {
  const user = await getSessionUser();
  if (!user) return jsonError("Unauthorized", 401);
  const { id } = await ctx.params;
  const order = await findOrderById(id);
  if (!order || order.userId !== user.id) return jsonError("Not found", 404);
  if (order.status !== "paid") {
    return jsonError("Only paid orders have a confirmation email", 409);
  }
  const [product, license] = await Promise.all([
    findProductById(order.productId),
    getOrderLicense(order.userId, order.id),
  ]);
  try {
    await resendPurchaseConfirmationEmail({
      order,
      deliveryContent: product?.deliveryContent,
      licenseKey: license?.title,
      license,
      requestUrl: request.url,
    });
  } catch (error) {
    console.error("Purchase confirmation resend failed", error);
    return jsonError(
      error instanceof Error
        ? error.message
        : "Could not send the confirmation email",
      502
    );
  }
  return Response.json({ sent: true, to: order.customerEmail });
}
