import { validateLicense } from "@/lib/lemonsqueezy/license-compat";
import { findCompatLicense, readBody, respond } from "../compat.utils";

export async function POST(request: Request) {
  const body = await readBody(request);
  const license = await findCompatLicense(body.license_key);
  return respond(license, validateLicense(license, { instanceId: body.instance_id || undefined }));
}
