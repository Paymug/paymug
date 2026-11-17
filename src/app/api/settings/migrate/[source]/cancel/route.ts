import { cancel, type SourceRouteContext } from "@/lib/migrations/route-handlers";

export const POST = (request: Request, ctx: SourceRouteContext) => cancel(request, ctx);
