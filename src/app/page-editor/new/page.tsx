import { notFound, redirect } from "next/navigation";
import { PageEditor } from "@/app/dashboard/pages/PageEditor";
import { getSessionUser } from "@/lib/auth";
import { hasProFeature } from "@/lib/app-license";

export default async function NewPageEditorPage() {
  if (!(await getSessionUser())) notFound();
  if (!(await hasProFeature("pages"))) redirect("/dashboard/pages");
  return <PageEditor />;
}
