import { getAppDeploymentInfo } from "@/lib/app-deployment";

export async function getLatestPaymugDeployment(): Promise<Response> {
  return Response.json(getAppDeploymentInfo(), {
    headers: {
      "Cache-Control": "public, max-age=60, s-maxage=300",
    },
  });
}
