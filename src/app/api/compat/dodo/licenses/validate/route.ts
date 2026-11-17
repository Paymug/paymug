import { dodoValidate } from "@/lib/migrations/dodo/license-compat";
import { findCompatLicense, readBody, respond } from "@/app/api/compat/lemonsqueezy/v1/licenses/compat.utils";

export async function POST(request: Request) {
  const body = await readBody(request);
  const license = await findCompatLicense(body.license_key);
  return respond(license, dodoValidate(license, { instanceId: body.license_key_instance_id || undefined }));
}
