import { subscriptionsLink, type SourceRouteContext } from "@/lib/migrations/route-handlers";

export const POST = (request: Request, ctx: SourceRouteContext) => subscriptionsLink(request, ctx);
