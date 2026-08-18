"use client";

import { ArrowLeft, ArrowSquareOut, Trash } from "@phosphor-icons/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Alert, Button, Input, Select } from "@/components/ui";
import { PageContentEditor } from "./PageContentEditor";
import { PageCoverUploader } from "./PageCoverUploader";
import { formatPageSlug } from "./page-editor.utils";
import type { PageEditorProps, PageEditorResponse } from "./PageEditor.types";
import type {
  StorePageNavigation,
  StorePageStatus,
} from "@/lib/store-pages.types";

export function PageEditor({ page }: PageEditorProps) {
  const router = useRouter();
  const [title, setTitle] = useState(page?.title || "");
  const [slug, setSlug] = useState(page?.slug || "");
  const [slugEdited, setSlugEdited] = useState(Boolean(page));
  const [description, setDescription] = useState(page?.description || "");
  const [coverImageUrl, setCoverImageUrl] = useState(page?.coverImageUrl || "");
  const [content, setContent] = useState(page?.content || "");
  const [navigation, setNavigation] = useState<StorePageNavigation>(
    page?.navigation || "none",
  );
  const [navigationLabel, setNavigationLabel] = useState(
    page?.navigationLabel || "",
  );
  const [status, setStatus] = useState<StorePageStatus>(
    page?.status || "draft",
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [domain, setDomain] = useState("your-domain.com");

  useEffect(() => {
    setDomain(window.location.host);
  }, []);

  async function save() {
    if (!title.trim()) {
      setError("Add a page title");
      return;
    }
    if (!slug) {
      setError("Add a page slug");
      return;
    }
    setSaving(true);
    setError("");
    setSaved(false);
    try {
      const response = await fetch(
        page ? `/api/pages/${page.id}` : "/api/pages",
        {
          method: page ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title,
            slug,
            description,
            coverImageUrl,
            content,
            navigation,
            navigationLabel,
            status,
          }),
        },
      );
      const data = (await response.json()) as PageEditorResponse;
      if (!response.ok || !data.page) {
        throw new Error(data.error || "Could not save page");
      }
      if (!page) {
        router.replace(`/page-editor/${data.page.id}`);
      } else {
        setSaved(true);
        router.refresh();
      }
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Could not save page",
      );
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!page || !window.confirm("Delete this page permanently?")) return;
    const response = await fetch(`/api/pages/${page.id}`, { method: "DELETE" });
    if (!response.ok) {
      const data = (await response.json()) as PageEditorResponse;
      setError(data.error || "Could not delete page");
      return;
    }
    router.push("/dashboard/pages");
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="grid min-h-screen lg:grid-cols-[minmax(0,1fr)_20rem]">
        <main className="min-w-0 pb-24">
          <div className="mx-auto flex max-w-4xl items-center px-5 py-6 sm:px-8">
            <Link
              href="/dashboard/pages"
              className="inline-flex items-center gap-2 text-sm font-medium text-muted hover:text-foreground"
            >
              <ArrowLeft size={16} /> Pages
            </Link>
          </div>
          <article className="mx-auto mt-4 max-w-4xl px-5 sm:px-8">
            {error && (
              <div className="mb-6">
                <Alert>{error}</Alert>
              </div>
            )}
            <div className="mx-auto max-w-[42rem] pb-12 pt-6 sm:pb-16">
              <textarea
                value={title}
                onChange={(event) => {
                  const nextTitle = event.target.value;
                  setTitle(nextTitle);
                  if (!slugEdited) setSlug(formatPageSlug(nextTitle));
                }}
                rows={2}
                maxLength={160}
                placeholder="Page title"
                className="w-full resize-none border-0 bg-transparent text-5xl font-bold leading-[1.04] tracking-[-0.045em] text-foreground outline-none placeholder:text-[#c6c5c1] sm:text-6xl"
              />
              <textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                rows={2}
                maxLength={320}
                placeholder="Add a short description…"
                className="mt-6 w-full resize-none border-0 bg-transparent text-xl leading-8 text-muted outline-none placeholder:text-[#c6c5c1]"
              />
            </div>
            <PageCoverUploader
              imageUrl={coverImageUrl}
              onChange={setCoverImageUrl}
              onError={setError}
            />
            <div className="py-12 sm:py-16">
              <PageContentEditor value={content} onChange={setContent} />
            </div>
          </article>
        </main>

        <aside className="m-2 self-start rounded-2xl border border-[#e8e8ee] bg-white lg:sticky lg:top-1 lg:h-[calc(100vh-0.5rem)]">
          <div className="flex h-full flex-col overflow-y-auto px-6">
            <div>
              <div className="flex items-center justify-between gap-4 py-4 mb-4 border-b border-border sticky top-0 bg-white z-10">
                <h2 className="text-lg font-semibold">Settings</h2>
                {page?.status === "published" ? (
                  <Link
                    href={`/${page.slug}`}
                    target="_blank"
                    className="inline-flex items-center gap-1.5 rounded-full border border-[#dedee7] px-3 py-1.5 text-xs font-semibold hover:bg-[#f5f5f2]"
                  >
                    <ArrowSquareOut size={14} />
                  </Link>
                ) : (
                  <button
                    type="button"
                    disabled
                    title="Publish and save the page to preview it"
                    className="inline-flex cursor-not-allowed items-center gap-1.5 rounded-full border border-[#dedee7] px-3 py-1.5 text-xs font-semibold opacity-45"
                  >
                    <ArrowSquareOut size={14} />
                  </button>
                )}
              </div>

              <div className="mt-7 flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold">Published</p>
                  <p className="mt-1 text-xs text-muted">
                    {status === "published"
                      ? "Visible to everyone"
                      : "Saved as a draft"}
                  </p>
                </div>

                <label className="relative inline-flex shrink-0 cursor-pointer items-center">
                  <input
                    type="checkbox"
                    className="peer sr-only"
                    checked={status === "published"}
                    onChange={(event) =>
                      setStatus(event.target.checked ? "published" : "draft")
                    }
                    aria-label="Publish page"
                  />
                  <span className="h-6 w-11 rounded-full bg-[#d9d9e1] transition peer-checked:bg-accent peer-focus-visible:ring-3 peer-focus-visible:ring-accent/30 after:absolute after:left-1 after:top-1 after:h-4 after:w-4 after:rounded-full after:bg-white after:shadow-sm after:transition-transform peer-checked:after:translate-x-5" />
                </label>
              </div>

              <label
                className="mt-7 block text-sm font-semibold"
                htmlFor="page-slug"
              >
                Page URL
              </label>
              <div className="mt-2 flex items-center rounded-xl border border-[#dedee7] bg-white px-3 focus-within:border-foreground">
                <span className="shrink-0 text-sm text-muted">/</span>
                <input
                  id="page-slug"
                  value={slug}
                  onChange={(event) => {
                    setSlugEdited(true);
                    setSlug(formatPageSlug(event.target.value));
                  }}
                  placeholder="page-slug"
                  className="min-w-0 flex-1 bg-transparent py-2.5 text-sm outline-none"
                />
              </div>
              <p className="mt-2 break-all text-xs text-muted">
                {domain}/{slug || "page-slug"}
              </p>

              <Select
                className="mt-7"
                label="Position"
                name="navigation"
                value={navigation}
                options={[
                  { value: "none", label: "Not in menu" },
                  { value: "top", label: "Top menu" },
                  { value: "footer", label: "Footer menu" },
                ]}
                onValueChange={(value) =>
                  setNavigation(value as StorePageNavigation)
                }
              />
              {navigation !== "none" && (
                <Input
                  className="mt-4"
                  label="Label"
                  value={navigationLabel}
                  maxLength={80}
                  placeholder={title || "Menu label"}
                  onChange={(event) => setNavigationLabel(event.target.value)}
                />
              )}
            </div>

            <div className="py-4 sticky bottom-0 lg:mt-auto flex flex-row gap-4 bg-white">

              {page && (
                <button
                  type="button"
                  onClick={() => void remove()}
                  className="p-2 text-sm font-medium text-red-600 hover:text-red-700"
                >
                  <Trash size={16} />
                </button>
              )}

              <Button
                type="button"
                onClick={() => void save()}
                disabled={saving}
                className="w-full"
              >
                {saving ? "Saving…" : saved ? "Saved" : "Update"}
              </Button>
              
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
