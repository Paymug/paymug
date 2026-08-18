const offlineGraceMs = 7 * 24 * 60 * 60 * 1000;

export async function workerHasProFeature(
  database: D1Database,
  feature: string,
  now = new Date(),
): Promise<boolean> {
  const row = await database
    .prepare(
      "SELECT status, features, expires_at, last_validated_at FROM app_licenses WHERE id = 'paymug-pro' LIMIT 1",
    )
    .first<{
      status: string;
      features: string;
      expires_at: string | null;
      last_validated_at: string | null;
    }>();
  if (row?.status !== "active" || !row.last_validated_at) return false;
  if (row.expires_at && new Date(row.expires_at).getTime() <= now.getTime()) {
    return false;
  }
  if (now.getTime() - new Date(row.last_validated_at).getTime() > offlineGraceMs) {
    return false;
  }
  try {
    return (JSON.parse(row.features) as unknown[]).includes(feature);
  } catch {
    return false;
  }
}
