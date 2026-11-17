import { subscriptionsMapping, type SourceRouteContext } from "@/lib/migrations/route-handlers";

export const POST = (request: Request, ctx: SourceRouteContext) => subscriptionsMapping(request, ctx);
