import { start, type SourceRouteContext } from "@/lib/migrations/route-handlers";

export const POST = (request: Request, ctx: SourceRouteContext) => start(request, ctx);
