import { subscriptionsCancel, type SourceRouteContext } from "@/lib/migrations/route-handlers";

export const POST = (request: Request, ctx: SourceRouteContext) => subscriptionsCancel(request, ctx);
