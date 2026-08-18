import { authenticateApiKey } from "@/lib/api-keys";
import { findUserById } from "@/lib/db";
import { listFeatureRecords } from "@/lib/feature-records";
import { jsonError } from "@/lib/utils";

export async function GET(req: Request) {
  const apiKey = await authenticateApiKey(req);
  if (!apiKey) return jsonError("Invalid or expired API key", 401);
  const user = await findUserById(apiKey.userId);
  return Response.json({
    customers: await listFeatureRecords(
      apiKey.userId,
      "customers",
      user?.environment
    ),
  });
}
