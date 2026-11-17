import { connect, type SourceRouteContext } from "@/lib/migrations/route-handlers";

export const POST = (request: Request, ctx: SourceRouteContext) => connect(request, ctx);
