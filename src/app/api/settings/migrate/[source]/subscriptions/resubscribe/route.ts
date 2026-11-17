import { subscriptionsResubscribe, type SourceRouteContext } from "@/lib/migrations/route-handlers";

export const POST = (request: Request, ctx: SourceRouteContext) => subscriptionsResubscribe(request, ctx);
