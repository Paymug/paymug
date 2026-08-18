import { redirect } from "next/navigation";
import type { EditStorePageProps } from "./page.types";

export default async function EditStorePage({ params }: EditStorePageProps) {
  const { id } = await params;
  redirect(`/page-editor/${id}`);
}
