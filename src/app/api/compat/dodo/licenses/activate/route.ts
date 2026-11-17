import { dodoActivate } from "@/lib/migrations/dodo/license-compat";
import { uid } from "@/lib/utils";
import { findCompatLicense, readBody, respond } from "@/app/api/compat/lemonsqueezy/v1/licenses/compat.utils";

export async function POST(request: Request) {
  const body = await readBody(request);
  const license = await findCompatLicense(body.license_key);
  return respond(license, dodoActivate(license, { name: (body.name || "").slice(0, 200) }, uid()));
}
