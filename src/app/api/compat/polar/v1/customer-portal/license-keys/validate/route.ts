import { polarValidate } from "@/lib/migrations/polar/license-compat";
import { findCompatLicense, readBody, respond } from "@/app/api/compat/lemonsqueezy/v1/licenses/compat.utils";

export async function POST(request: Request) {
  const body = await readBody(request);
  const license = await findCompatLicense(body.key);
  return respond(license, polarValidate(license, { activationId: body.activation_id || undefined }));
}
