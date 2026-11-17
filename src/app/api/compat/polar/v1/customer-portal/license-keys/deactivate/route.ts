import { polarDeactivate } from "@/lib/migrations/polar/license-compat";
import { findCompatLicense, readBody, saveInstances } from "@/app/api/compat/lemonsqueezy/v1/licenses/compat.utils";

export async function POST(request: Request) {
  const body = await readBody(request);
  const license = await findCompatLicense(body.key);
  const result = polarDeactivate(license, { activationId: body.activation_id || "" });
  if (license && result.nextInstances) await saveInstances(license, result.nextInstances);
  return result.status === 204
    ? new Response(null, { status: 204 })
    : Response.json(result.body, { status: result.status });
}
