import { preview, type SourceRouteContext } from "@/lib/migrations/route-handlers";

export const POST = (request: Request, ctx: SourceRouteContext) => preview(request, ctx);
