import { subscriptionsList, type SourceRouteContext } from "@/lib/migrations/route-handlers";

export const GET = (request: Request, ctx: SourceRouteContext) => subscriptionsList(request, ctx);
