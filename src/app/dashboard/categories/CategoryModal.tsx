"use client";

import { X } from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Alert, Button, Input, Textarea } from "@/components/ui";
import { MultiSelectDropdown } from "@/components/MultiSelectDropdown";
import { slugify } from "@/lib/format";
import type {
  CategoryApiResponse,
  CategoryModalProps,
} from "./categories.types";

export function CategoryModal({
  category,
  products,
  onClose,
}: CategoryModalProps) {
  const router = useRouter();
  const [name, setName] = useState(category?.name || "");
  const [slug, setSlug] = useState(category?.slug || "");
  const [description, setDescription] = useState(category?.description || "");
  const [productIds, setProductIds] = useState(
    category
      ? products
          .filter((product) => product.categoryIds.includes(category.id))
          .map((product) => product.id)
      : [],
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    const response = await fetch(
      category ? `/api/categories/${category.id}` : "/api/categories",
      {
        method: category ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, slug, description, productIds }),
      },
    );
    const data = (await response.json()) as CategoryApiResponse;
    setSaving(false);
    if (!response.ok) {
      setError(
        data.error ||
          (category ? "Could not update category" : "Could not create category"),
      );
      return;
    }
    onClose();
    router.refresh();
  }

  return (
    <div
      className="fixed inset-0 z-80 flex items-center justify-center bg-[#24242c]/35 p-4 backdrop-blur-[2px]"
      role="presentation"
      onMouseDown={(event) => {
        if (event.currentTarget === event.target && !saving) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="category-modal-title"
        className="w-full max-w-lg rounded-2xl border border-[#e8e8ee] bg-white shadow-[0_24px_70px_rgba(24,22,32,0.2)]"
      >
        <div className="flex items-center justify-between border-b border-[#e8e8ee] px-6 py-4">
          <h2 id="category-modal-title" className="text-lg font-semibold">
            {category ? "Edit category" : "Add category"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="grid h-9 w-9 place-items-center rounded-lg text-muted hover:bg-[#f7f7f8] hover:text-foreground"
            aria-label="Close category dialog"
          >
            <X size={18} weight="bold" />
          </button>
        </div>
        <form onSubmit={save} className="space-y-5 p-6">
          <Input
            label="Name"
            value={name}
            onChange={(event) => {
              const nextName = event.target.value;
              setName(nextName);
              if (!category) setSlug(slugify(nextName));
            }}
            placeholder="Design resources"
            required
            autoFocus
          />
          <Input
            label="Slug"
            value={slug}
            onChange={(event) => setSlug(slugify(event.target.value))}
            placeholder="design-resources"
            required
          />
          <Textarea
            label="Description (optional)"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            maxLength={500}
          />
          <MultiSelectDropdown
            label="Products"
            name="productIds"
            values={productIds}
            options={products.map((product) => ({
              value: product.id,
              label: product.name,
            }))}
            placeholder="No products selected"
            onChange={setProductIds}
          />
          {error && <Alert>{error}</Alert>}
          <div className="flex justify-end gap-2 border-t border-[#e8e8ee] pt-5">
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving
                ? "Saving…"
                : category
                  ? "Save changes"
                  : "Add category"}
            </Button>
          </div>
        </form>
      </section>
    </div>
  );
}
