import { activateAuthorityLicense } from "@/lib/app-license-authority";
import { parseLicenseAuthorityRequest } from "../license-route.utils";

export async function POST(request: Request) {
  const input = await parseLicenseAuthorityRequest(request);
  if (input instanceof Response) return input;
  const result = await activateAuthorityLicense(input, request.url);
  return Response.json(result, { status: result.valid ? 200 : 409 });
}
