import type { StoreDomainRow } from "./store-domain-redirect.types";

export async function getStoreDomainRedirect(
  request: Request,
  database: D1Database,
): Promise<Response | null> {
  const requestUrl = new URL(request.url);
  if (
    requestUrl.pathname === "/api" ||
    requestUrl.pathname.startsWith("/api/")
  ) {
    return null;
  }

  let row: StoreDomainRow | null;
  try {
    row = await database
      .prepare(
        `SELECT stores.domain AS domain
         FROM users
         INNER JOIN stores
           ON stores.id = COALESCE(
             NULLIF(users.primary_store_id, 'primary_store_id'),
             NULLIF(users.active_store_id, 'active_store_id')
           )
         WHERE stores.is_active = 1
           AND stores.domain IS NOT NULL
           AND stores.domain != ''
         ORDER BY users.created_at ASC
         LIMIT 1`,
      )
      .first<StoreDomainRow>();
  } catch {
    // The app's setup flow is responsible for creating and migrating an empty D1 database.
    return null;
  }

  if (!row?.domain) return null;

  let storeUrl: URL;
  try {
    storeUrl = new URL(row.domain);
  } catch {
    return null;
  }
  if (storeUrl.origin === requestUrl.origin) return null;

  storeUrl.pathname = requestUrl.pathname;
  storeUrl.search = requestUrl.search;
  return Response.redirect(storeUrl, 308);
}
