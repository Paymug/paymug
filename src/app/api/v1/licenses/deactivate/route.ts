import { deactivateAuthorityLicense } from "@/lib/app-license-authority";
import { parseLicenseAuthorityRequest } from "../license-route.utils";

export async function POST(request: Request) {
  const input = await parseLicenseAuthorityRequest(request);
  if (input instanceof Response) return input;
  return Response.json(
    await deactivateAuthorityLicense(input, request.url),
  );
}
