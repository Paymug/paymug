/**
 * Lemon Squeezy License API compatibility. Pure logic over a license record's
 * `data` so it can be tested without a database. Instances live in
 * `data.lemonSqueezyInstances`, the same list the importer fills.
 */

export interface CompatInstance {
  id: string;
  name: string;
  createdAt: string;
}

export interface CompatLicense {
  id: string;
  key: string;
  status: string; // feature record status
  environment: "sandbox" | "live";
  createdAt: string;
  data: Record<string, unknown>;
}

export type CompatLicenseState = "inactive" | "active" | "expired" | "disabled";

export function readInstances(data: Record<string, unknown>): CompatInstance[] {
  const raw = data.lemonSqueezyInstances;
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const i = item as Partial<CompatInstance>;
    return typeof i.id === "string"
      ? [{ id: i.id, name: String(i.name ?? ""), createdAt: String(i.createdAt ?? "") }]
      : [];
  });
}

export function licenseState(license: CompatLicense, now = Date.now()): CompatLicenseState {
  if (license.status !== "active") return "disabled";
  const expiresAt = typeof license.data.expiresAt === "string" ? license.data.expiresAt : null;
  if (expiresAt && new Date(expiresAt).getTime() <= now) return "expired";
  return readInstances(license.data).length > 0 ? "active" : "inactive";
}

function activationLimit(data: Record<string, unknown>): number {
  // LS reports 0 for unlimited.
  const limit = data.seatLimit;
  return typeof limit === "number" && limit > 0 ? limit : 0;
}

function licenseKeyObject(license: CompatLicense, instances: CompatInstance[], now: number) {
  return {
    id: license.id,
    status: licenseState(
      { ...license, data: { ...license.data, lemonSqueezyInstances: instances } },
      now,
    ),
    key: license.key,
    activation_limit: activationLimit(license.data),
    activation_usage: instances.length,
    created_at: license.createdAt,
    expires_at: typeof license.data.expiresAt === "string" ? license.data.expiresAt : null,
    test_mode: license.environment === "sandbox",
  };
}

function metaObject(license: CompatLicense) {
  const d = license.data;
  return {
    store_id: d.storeId ?? null,
    order_id: d.orderId ?? null,
    product_id: d.productId ?? null,
    product_name: d.product ?? null,
    variant_id: d.variantId ?? null,
    variant_name: d.variantName ?? null,
    customer_id: null,
    customer_name: null,
    customer_email: d.customerEmail ?? null,
  };
}

const instanceObject = (i: CompatInstance) => ({
  id: i.id,
  name: i.name,
  created_at: i.createdAt,
});

export interface CompatResult {
  status: number;
  body: Record<string, unknown>;
  /** New instances list to persist, when the call changed it. */
  nextInstances?: CompatInstance[];
}

const notFound = (flag: string): CompatResult => ({
  status: 404,
  body: { [flag]: false, error: "license_key not found.", license_key: null, instance: null, meta: null },
});

export function validateLicense(
  license: CompatLicense | undefined,
  input: { instanceId?: string },
  now = Date.now(),
): CompatResult {
  if (!license) return notFound("valid");
  const instances = readInstances(license.data);
  const state = licenseState(license, now);
  const instance = input.instanceId
    ? instances.find((i) => i.id === input.instanceId)
    : undefined;
  let error: string | null = null;
  if (state === "disabled") error = "This license key has been disabled.";
  else if (state === "expired") error = "This license key has expired.";
  else if (input.instanceId && !instance) error = "This license key is not activated for the given instance.";
  return {
    status: 200,
    body: {
      valid: error === null,
      error,
      license_key: licenseKeyObject(license, instances, now),
      instance: instance ? instanceObject(instance) : null,
      meta: metaObject(license),
    },
  };
}

export function activateLicense(
  license: CompatLicense | undefined,
  input: { instanceName: string },
  newInstanceId: string,
  now = Date.now(),
): CompatResult {
  if (!license) return notFound("activated");
  const instances = readInstances(license.data);
  const state = licenseState(license, now);
  const fail = (error: string): CompatResult => ({
    status: 400,
    body: {
      activated: false,
      error,
      license_key: licenseKeyObject(license, instances, now),
      instance: null,
      meta: metaObject(license),
    },
  });
  if (state === "disabled") return fail("This license key has been disabled.");
  if (state === "expired") return fail("This license key has expired.");
  const limit = activationLimit(license.data);
  if (limit > 0 && instances.length >= limit) {
    return fail("This license key has reached the activation limit.");
  }
  const instance: CompatInstance = {
    id: newInstanceId,
    name: input.instanceName,
    createdAt: new Date(now).toISOString(),
  };
  const next = [...instances, instance];
  return {
    status: 200,
    body: {
      activated: true,
      error: null,
      license_key: licenseKeyObject(license, next, now),
      instance: instanceObject(instance),
      meta: metaObject(license),
    },
    nextInstances: next,
  };
}

export function deactivateLicense(
  license: CompatLicense | undefined,
  input: { instanceId: string },
  now = Date.now(),
): CompatResult {
  if (!license) return notFound("deactivated");
  const instances = readInstances(license.data);
  if (!instances.some((i) => i.id === input.instanceId)) {
    return {
      status: 404,
      body: {
        deactivated: false,
        error: "license_key instance not found.",
        license_key: licenseKeyObject(license, instances, now),
        meta: metaObject(license),
      },
    };
  }
  const next = instances.filter((i) => i.id !== input.instanceId);
  return {
    status: 200,
    body: {
      deactivated: true,
      error: null,
      license_key: licenseKeyObject(license, next, now),
      meta: metaObject(license),
    },
    nextInstances: next,
  };
}
