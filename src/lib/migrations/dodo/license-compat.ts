/**
 * Dodo Payments public license API compatibility (`/licenses/{activate,
 * validate,deactivate}`). Pure logic over the importer's license record data.
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

const err = (status: number, detail: string): CompatResult => ({ status, body: { detail } });

export function dodoValidate(
  license: CompatLicense | undefined,
  input: { instanceId?: string },
  now = Date.now(),
): CompatResult {
  if (!license) return { status: 200, body: { valid: false } };
  const state = licenseState(license, now);
  if (state === "disabled" || state === "expired") return { status: 200, body: { valid: false } };
  if (input.instanceId && !readInstances(license.data).some((i) => i.id === input.instanceId)) {
    return { status: 200, body: { valid: false } };
  }
  return { status: 200, body: { valid: true } };
}

export function dodoActivate(
  license: CompatLicense | undefined,
  input: { name: string },
  newId: string,
  now = Date.now(),
): CompatResult {
  if (!license) return err(404, "License key not found");
  const state = licenseState(license, now);
  if (state === "disabled" || state === "expired") return err(403, "License key is inactive");
  const instances = readInstances(license.data);
  const limit = limitOf(license.data);
  if (limit !== null && instances.length >= limit) return err(422, "License key activation limit reached");
  const instance: CompatInstance = { id: newId, name: input.name, createdAt: new Date(now).toISOString() };
  const email = typeof license.data.customerEmail === "string" ? license.data.customerEmail : "";
  return {
    status: 201,
    body: {
      id: instance.id,
      business_id: typeof license.data.storeId === "string" ? license.data.storeId : "",
      name: instance.name,
      license_key_id: license.id,
      created_at: instance.createdAt,
      product: {
        product_id: typeof license.data.productId === "string" ? license.data.productId : "",
        name: typeof license.data.product === "string" ? license.data.product : null,
      },
      customer: { customer_id: email, name: "", email },
    },
    nextInstances: [...instances, instance],
  };
}

export function dodoDeactivate(
  license: CompatLicense | undefined,
  input: { instanceId: string },
): CompatResult {
  if (!license) return err(404, "License key not found");
  const instances = readInstances(license.data);
  if (!instances.some((i) => i.id === input.instanceId)) {
    return err(403, "License key instance not found or does not belong to the license key");
  }
  return { status: 200, body: {}, nextInstances: instances.filter((i) => i.id !== input.instanceId) };
}
