import { activateLicense } from "@/lib/lemonsqueezy/license-compat";
import { uid } from "@/lib/utils";
import { findCompatLicense, readBody, respond } from "../compat.utils";

export async function POST(request: Request) {
  const body = await readBody(request);
  const license = await findCompatLicense(body.license_key);
  return respond(
    license,
    activateLicense(license, { instanceName: (body.instance_name || "").slice(0, 200) }, uid()),
  );
}
