import { toFailuresCsv } from "@/lib/lemonsqueezy/import-engine";
import { buildJobReports } from "@/lib/lemonsqueezy/import-job";
import { jsonError } from "@/lib/utils";
import { authorizeMigration } from "../auth";

export async function GET(request: Request) {
  const auth = await authorizeMigration(request, "read");
  if ("error" in auth) return auth.error;
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return jsonError("id is required");
  const report = await buildJobReports(auth.user.id, id);
  if (!report) return jsonError("Job not found", 404);
  const { state } = report;
  return new Response(toFailuresCsv(state.errors), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="lemonsqueezy-report.csv"',
    },
  });
}
