import { listMigrationSubscriptions } from "@/lib/lemonsqueezy/subscription-migration";
import { authorizeMigration } from "../auth";

/** Subscription rows for the migration checklist. */
export async function GET(request: Request) {
  const auth = await authorizeMigration(request, "read");
  if ("error" in auth) return auth.error;
  const subscriptions = await listMigrationSubscriptions(
    auth.user.id,
    auth.user.activeStoreId,
    auth.user.environment,
  );
  return Response.json({ subscriptions });
}
