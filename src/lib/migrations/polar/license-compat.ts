/**
 * Polar customer-portal license API compatibility. Pure logic over the same
 * license record data the importer fills (`data.lemonSqueezyInstances`).
 */
import {
  licenseState,
  readInstances,
  type CompatInstance,
  type CompatLicense,
  type CompatResult,
} from "../../lemonsqueezy/license-compat";

function limitOf(data: Record<string, unknown>): number | null {
  const limit = data.seatLimit;
  return typeof limit === "number" && limit > 0 ? limit : null;
}

function activationObject(i: CompatInstance, license: CompatLicense, instances: CompatInstance[], now: number) {
  return {
    id: i.id,
    license_key_id: license.id,
    label: i.name,
    meta: {},
    created_at: i.createdAt,
    modified_at: null,
    license_key: keyObject(license, instances, now),
  };
}

function keyObject(license: CompatLicense, instances: CompatInstance[], now: number) {
  const state = licenseState({ ...license, data: { ...license.data, lemonSqueezyInstances: instances } }, now);
  const email = typeof license.data.customerEmail === "string" ? license.data.customerEmail : null;
  return {
    id: license.id,
    created_at: license.createdAt,
    modified_at: null,
    organization_id: typeof license.data.storeId === "string" ? license.data.storeId : "",
    customer_id: email ?? "",
    customer: { id: email ?? "", email, name: null },
    benefit_id: typeof license.data.productId === "string" ? license.data.productId : "",
    key: license.key,
    display_key: license.key,
    status: state === "disabled" ? "disabled" : "granted",
    limit_activations: limitOf(license.data),
    usage: instances.length,
    limit_usage: null,
    validations: 0,
    last_validated_at: null,
    expires_at: typeof license.data.expiresAt === "string" ? license.data.expiresAt : null,
  };
}

const notFound = (): CompatResult => ({
  status: 404,
  body: { error: "ResourceNotFound", detail: "License key does not exist." },
});

export function polarValidate(
  license: CompatLicense | undefined,
  input: { activationId?: string },
  now = Date.now(),
): CompatResult {
  if (!license) return notFound();
  const instances = readInstances(license.data);
  const state = licenseState(license, now);
  const activation = input.activationId ? instances.find((i) => i.id === input.activationId) : undefined;
  if (input.activationId && !activation) return notFound();
  // Polar returns the key with status; expired/disabled keys fail validation client-side.
  const key = keyObject(license, instances, now);
  return {
    status: 200,
    body: {
      ...key,
      status: state === "expired" ? "revoked" : key.status,
      activation: activation
        ? { id: activation.id, license_key_id: license.id, label: activation.name, meta: {}, created_at: activation.createdAt, modified_at: null }
        : null,
    },
  };
}

export function polarActivate(
  license: CompatLicense | undefined,
  input: { label: string },
  newId: string,
  now = Date.now(),
): CompatResult {
  if (!license) return notFound();
  const instances = readInstances(license.data);
  const state = licenseState(license, now);
  if (state === "disabled" || state === "expired") {
    return { status: 403, body: { error: "NotPermitted", detail: "License key is not active." } };
  }
  const limit = limitOf(license.data);
  if (limit !== null && instances.length >= limit) {
    return { status: 403, body: { error: "NotPermitted", detail: "License key activation limit already reached." } };
  }
  const instance: CompatInstance = { id: newId, name: input.label, createdAt: new Date(now).toISOString() };
  const next = [...instances, instance];
  return { status: 200, body: activationObject(instance, license, next, now), nextInstances: next };
}

/** Polar answers 204 with no body. */
export function polarDeactivate(
  license: CompatLicense | undefined,
  input: { activationId: string },
): CompatResult {
  if (!license) return notFound();
  const instances = readInstances(license.data);
  if (!instances.some((i) => i.id === input.activationId)) return notFound();
  return { status: 204, body: {}, nextInstances: instances.filter((i) => i.id !== input.activationId) };
}
