import { z } from "zod";
import { jsonError } from "@/lib/utils";
import { completeFreePurchase } from "./complete.utils";

const schema = z.object({
  productId: z.string().min(1),
  customerEmail: z.string().email(),
  customerName: z.string().max(120).optional(),
  discountCode: z.string().max(60).optional(),
  affiliateCode: z.string().max(80).optional(),
  marketingOptIn: z.boolean().optional(),
});

export async function POST(req: Request) {
  try {
    const parsed = schema.safeParse(await req.json());
    if (!parsed.success) {
      return jsonError(parsed.error.issues[0]?.message || "Invalid input");
    }
    const result = await completeFreePurchase(parsed.data, req.url);
    return Response.json(result);
  } catch (error) {
    return jsonError(
      error instanceof Error ? error.message : "Could not complete purchase",
      400
    );
  }
}
