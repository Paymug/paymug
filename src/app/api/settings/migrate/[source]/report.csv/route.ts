import { report, type SourceRouteContext } from "@/lib/migrations/route-handlers";

export const GET = (request: Request, ctx: SourceRouteContext) => report(request, ctx, "failures");
