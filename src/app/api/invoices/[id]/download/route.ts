import { getInvoiceAccess, renderInvoiceHtml } from "@/lib/invoices";
import { jsonError } from "@/lib/utils";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const access = await getInvoiceAccess((await params).id);
  if (!access) return jsonError("Invoice not found", 404);
  const { invoice } = access;
  return new Response(renderInvoiceHtml(invoice), {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Content-Disposition": `attachment; filename="${invoice.number}.html"`,
      "Cache-Control": "private, no-store",
    },
  });
}
