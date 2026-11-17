import { statusGet, statusPost, type SourceRouteContext } from "@/lib/migrations/route-handlers";

export const GET = (request: Request, ctx: SourceRouteContext) => statusGet(request, ctx);
export const POST = (request: Request, ctx: SourceRouteContext) => statusPost(request, ctx);
