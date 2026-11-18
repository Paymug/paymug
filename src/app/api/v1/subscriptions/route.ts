import { authorizeApiKey } from "@/lib/api-keys";
import { findUserById } from "@/lib/db";
import { listFeatureRecords } from "@/lib/feature-records";

export async function GET(req: Request) {
  const auth = await authorizeApiKey(req, "subscriptions", "read");
  if ("error" in auth) return auth.error;
  const { apiKey } = auth;
  const user = await findUserById(apiKey.userId);
  return Response.json({
    subscriptions: await listFeatureRecords(
      apiKey.userId,
      "subscriptions",
      user?.environment
    ),
  });
}
