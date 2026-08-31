"use client";

import {
  ArrowDown,
  ArrowUp,
  PencilSimple,
  Plus,
  Trash,
} from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Alert, Button } from "@/components/ui";
import type { ProductCategory } from "@/lib/types";
import { CategoryModal } from "./CategoryModal";
import type {
  CategoriesWorkspaceProps,
  CategoryApiResponse,
} from "./categories.types";

export function CategoriesWorkspace({
  categories,
  products,
}: CategoriesWorkspaceProps) {
  const router = useRouter();
  const [modalCategory, setModalCategory] = useState<
    ProductCategory | null | undefined
  >(undefined);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [orderedCategories, setOrderedCategories] = useState(categories);
  const [reordering, setReordering] = useState(false);

  useEffect(() => setOrderedCategories(categories), [categories]);

  async function move(categoryId: string, direction: -1 | 1) {
    const currentIndex = orderedCategories.findIndex(
      (category) => category.id === categoryId,
    );
    const nextIndex = currentIndex + direction;
    if (
      currentIndex < 0 ||
      nextIndex < 0 ||
      nextIndex >= orderedCategories.length
    ) {
      return;
    }
    const previous = orderedCategories;
    const next = [...orderedCategories];
    [next[currentIndex], next[nextIndex]] = [next[nextIndex], next[currentIndex]];
    setOrderedCategories(next);
    setReordering(true);
    setError(null);
    const response = await fetch("/api/categories/reorder", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ categoryIds: next.map((category) => category.id) }),
    });
    const data = (await response.json()) as CategoryApiResponse;
    setReordering(false);
    if (!response.ok) {
      setOrderedCategories(previous);
      setError(data.error || "Could not reorder categories");
      return;
    }
    router.refresh();
  }

  async function remove(category: ProductCategory) {
    if (
      !window.confirm(
        `Delete ${category.name}? Products will become uncategorized.`,
      )
    ) {
      return;
    }
    setDeletingId(category.id);
    setError(null);
    const response = await fetch(`/api/categories/${category.id}`, {
      method: "DELETE",
    });
    const data = (await response.json()) as CategoryApiResponse;
    setDeletingId(null);
    if (!response.ok) {
      setError(data.error || "Could not delete category");
      return;
    }
    router.refresh();
  }

  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <p className="text-sm text-muted">
          Group products into storefront collections with their own public URL.
        </p>
        <Button type="button" onClick={() => setModalCategory(null)}>
          <Plus size={16} weight="bold" />
          Add category
        </Button>
      </div>

      {error && (
        <div className="mt-5">
          <Alert>{error}</Alert>
        </div>
      )}

      <section className="mt-6 overflow-x-auto rounded-xl border border-[#e8e8ee] bg-white">
        {orderedCategories.length ? (
          <table className="w-full min-w-[680px] text-left text-sm">
            <thead>
              <tr className="border-b border-[#e8e8ee] text-muted">
                <th className="px-5 py-3 font-medium">Name</th>
                <th className="px-5 py-3 font-medium">URL</th>
                <th className="px-5 py-3 font-medium">Description</th>
                <th className="w-44 px-5 py-3 font-medium" />
              </tr>
            </thead>
            <tbody>
              {orderedCategories.map((category, index) => (
                <tr
                  key={category.id}
                  className="border-b border-[#ededf2] last:border-0"
                >
                  <td className="px-5 py-4 font-medium">{category.name}</td>
                  <td className="px-5 py-4 font-mono text-xs text-muted">
                    /{category.slug}
                  </td>
                  <td className="max-w-sm truncate px-5 py-4 text-muted">
                    {category.description || "—"}
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex justify-end gap-1">
                      <button
                        type="button"
                        onClick={() => void move(category.id, -1)}
                        disabled={reordering || index === 0}
                        className="grid h-9 w-9 place-items-center rounded-lg text-muted hover:bg-[#f7f7f8] hover:text-foreground disabled:opacity-30"
                        aria-label={`Move ${category.name} up`}
                      >
                        <ArrowUp size={17} />
                      </button>
                      <button
                        type="button"
                        onClick={() => void move(category.id, 1)}
                        disabled={reordering || index === orderedCategories.length - 1}
                        className="grid h-9 w-9 place-items-center rounded-lg text-muted hover:bg-[#f7f7f8] hover:text-foreground disabled:opacity-30"
                        aria-label={`Move ${category.name} down`}
                      >
                        <ArrowDown size={17} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setModalCategory(category)}
                        className="grid h-9 w-9 place-items-center rounded-lg text-muted hover:bg-[#f7f7f8] hover:text-foreground"
                        aria-label={`Edit ${category.name}`}
                      >
                        <PencilSimple size={17} />
                      </button>
                      <button
                        type="button"
                        onClick={() => void remove(category)}
                        disabled={deletingId === category.id}
                        className="grid h-9 w-9 place-items-center rounded-lg text-muted hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                        aria-label={`Delete ${category.name}`}
                      >
                        <Trash size={17} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="px-6 py-14 text-center">
            <p className="text-sm font-medium">No product categories yet</p>
            <p className="mt-1 text-sm text-muted">
              Add a category, then assign it from a product’s category dropdown.
            </p>
          </div>
        )}
      </section>

      {modalCategory !== undefined && (
        <CategoryModal
          key={modalCategory?.id || "new"}
          category={modalCategory || undefined}
          products={products}
          onClose={() => setModalCategory(undefined)}
        />
      )}
    </>
  );
}
