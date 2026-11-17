import { polarActivate } from "@/lib/migrations/polar/license-compat";
import { uid } from "@/lib/utils";
import { findCompatLicense, readBody, respond } from "@/app/api/compat/lemonsqueezy/v1/licenses/compat.utils";

export async function POST(request: Request) {
  const body = await readBody(request);
  const license = await findCompatLicense(body.key);
  return respond(license, polarActivate(license, { label: (body.label || "").slice(0, 200) }, uid()));
}
