"use client";

import { ArrowDown, ArrowUp } from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { PayWhatYouWantBadge } from "@/components/PayWhatYouWantBadge";
import { getProductDescriptionPlainText } from "@/components/product-description.utils";
import { Alert } from "@/components/ui";
import { formatMoney } from "@/lib/format";
import {
  formatLicenseUpdatePeriodLabel,
  isPerpetualLicenseProduct,
} from "@/lib/license-entitlements";
import { formatProductPriceSuffix } from "@/lib/product-billing";
import { getProductStartingPrice } from "@/lib/product-configurations";
import { sortProductsByOrder } from "@/lib/product-order.utils";
import type { Product, ProductCategory } from "@/lib/types";
import type { StorefrontLayoutEditorProps } from "./StorefrontLayoutEditor.types";

const uncategorizedKey = "";

function buildSectionProducts(
  categories: ProductCategory[],
  products: Product[],
  categoryProductOrder: Record<string, string[]>,
): Record<string, string[]> {
  const result: Record<string, string[]> = {};
  const knownCategoryIds = new Set(categories.map((category) => category.id));
  result[uncategorizedKey] = products
    .filter(
      (product) =>
        !product.categoryIds.some((id) => knownCategoryIds.has(id)),
    )
    .map((product) => product.id);
  for (const category of categories) {
    result[category.id] = sortProductsByOrder(
      products.filter((product) => product.categoryIds.includes(category.id)),
      categoryProductOrder[category.id],
    ).map((product) => product.id);
  }
  return result;
}

export function StorefrontLayoutEditor({
  categories,
  products,
  categoryProductOrder,
  displayPurchases,
}: StorefrontLayoutEditorProps) {
  const router = useRouter();
  const [orderedCategories, setOrderedCategories] = useState(categories);
  const [sectionProducts, setSectionProducts] = useState<Record<string, string[]>>(
    () => buildSectionProducts(categories, products, categoryProductOrder),
  );
  const [dragProduct, setDragProduct] = useState<
    { productId: string; sectionId: string } | undefined
  >();
  const [overSection, setOverSection] = useState<string | undefined>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  useEffect(() => {
    setOrderedCategories(categories);
    setSectionProducts(
      buildSectionProducts(categories, products, categoryProductOrder),
    );
  }, [categories, products, categoryProductOrder]);

  const productById = new Map(products.map((product) => [product.id, product]));

  async function patch(url: string, body: unknown): Promise<void> {
    const response = await fetch(url, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      const data = (await response.json().catch(() => ({}))) as {
        error?: string;
      };
      throw new Error(data.error || "Could not save changes");
    }
  }

  async function persistMove(
    productId: string,
    sourceSectionId: string,
    targetSectionId: string,
    targetIds: string[],
  ) {
    setBusy(true);
    setError(undefined);
    try {
      if (targetSectionId !== sourceSectionId) {
        await patch(`/api/products/${productId}/categories`, {
          categoryIds: targetSectionId ? [targetSectionId] : [],
        });
      }
      if (targetSectionId !== uncategorizedKey) {
        await patch(`/api/categories/${targetSectionId}/products/reorder`, {
          productIds: targetIds,
        });
      }
    } catch (moveError) {
      setError(
        moveError instanceof Error
          ? moveError.message
          : "Could not move product",
      );
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  function dropProduct(targetSectionId: string, targetIndex: number) {
    const drag = dragProduct;
    if (!drag) return;
    setDragProduct(undefined);
    setOverSection(undefined);
    const sourceIds = sectionProducts[drag.sectionId] ?? [];
    const targetIdsOriginal = sectionProducts[targetSectionId] ?? [];

    let insertAt = targetIndex;
    if (drag.sectionId === targetSectionId) {
      const originalIndex = targetIdsOriginal.indexOf(drag.productId);
      if (originalIndex !== -1 && originalIndex < targetIndex) insertAt -= 1;
    }
    const nextSource = sourceIds.filter((id) => id !== drag.productId);
    const nextTarget =
      drag.sectionId === targetSectionId
        ? nextSource
        : [...targetIdsOriginal];
    nextTarget.splice(Math.max(0, insertAt), 0, drag.productId);

    setSectionProducts({
      ...sectionProducts,
      [drag.sectionId]: nextSource,
      [targetSectionId]: nextTarget,
    });
    void persistMove(
      drag.productId,
      drag.sectionId,
      targetSectionId,
      nextTarget,
    );
  }

  async function moveCategory(categoryId: string, direction: -1 | 1) {
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
    [next[currentIndex], next[nextIndex]] = [
      next[nextIndex],
      next[currentIndex],
    ];
    setOrderedCategories(next);
    setBusy(true);
    setError(undefined);
    try {
      await patch("/api/categories/reorder", {
        categoryIds: next.map((category) => category.id),
      });
    } catch (moveError) {
      setOrderedCategories(previous);
      setError(
        moveError instanceof Error
          ? moveError.message
          : "Could not reorder sections",
      );
    } finally {
      setBusy(false);
    }
  }

  function renderProduct(product: Product, sectionId: string) {
    const dragging = dragProduct?.productId === product.id;
    const sectionIds = sectionProducts[sectionId] ?? [];
    const index = sectionIds.indexOf(product.id);
    return (
      <div
        key={product.id}
        draggable
        onDragStart={(event) => {
          setDragProduct({ productId: product.id, sectionId });
          event.dataTransfer.effectAllowed = "move";
          event.dataTransfer.setData("text/plain", product.id);
        }}
        onDragEnd={() => {
          setDragProduct(undefined);
          setOverSection(undefined);
        }}
        onDragOver={(event) => {
          if (!dragProduct) return;
          event.preventDefault();
          event.stopPropagation();
          setOverSection(sectionId);
        }}
        onDrop={(event) => {
          if (!dragProduct) return;
          event.preventDefault();
          event.stopPropagation();
          const rect = event.currentTarget.getBoundingClientRect();
          const after = event.clientX > rect.left + rect.width / 2;
          dropProduct(sectionId, index + (after ? 1 : 0));
        }}
        className={`group flex cursor-grab flex-col transition shadow-gray-300/20 active:cursor-grabbing ${
          dragging ? "opacity-40" : ""
        }`}
      >
        {product.imageUrl ? (
          <img
            src={product.imageUrl}
            alt={product.name}
            className="aspect-[16/9] w-full rounded-xl object-cover"
            draggable={false}
          />
        ) : (
          <div className="flex h-28 items-center justify-center bg-accent-soft text-3xl">
            📦
          </div>
        )}
        <h3 className="mt-4 font-semibold group-hover:text-accent-dark">
          {product.name}
        </h3>
        <p
          className="mt-1 line-clamp-2 flex-1 text-sm text-muted"
          dangerouslySetInnerHTML={{
            __html:
              getProductDescriptionPlainText(product.description) ||
              "Digital product",
          }}
        />
        <div className="mt-4 flex flex-row justify-between">
          <div className="flex items-center gap-1.5">
            <p className="text-lg font-bold">
              {!!product.options.length && "From "}
              {formatMoney(
                getProductStartingPrice(product),
                product.currency,
              )}
              {formatProductPriceSuffix(product)}
            </p>
            {product.customAmountEnabled && <PayWhatYouWantBadge />}
          </div>
          {displayPurchases && product.purchaseCount ? (
            <p className="mt-1 text-xs text-muted">
              {product.purchaseCount.toLocaleString()} purchased
            </p>
          ) : null}
        </div>
        {isPerpetualLicenseProduct(product) && (
          <p className="mt-1 text-xs text-muted">
            Lifetime use ·{" "}
            {formatLicenseUpdatePeriodLabel(
              product.licenseUpdatePeriodUnit || "year",
              product.licenseUpdatePeriodCount,
            )}{" "}
            of updates
          </p>
        )}
      </div>
    );
  }

  function renderGrid(sectionId: string) {
    const ids = sectionProducts[sectionId] ?? [];
    const items = ids
      .map((id) => productById.get(id))
      .filter((product): product is Product => Boolean(product));
    if (items.length === 0) {
      if (!dragProduct) return null;
      return (
        <div
          onDragOver={(event) => {
            event.preventDefault();
            setOverSection(sectionId);
          }}
          onDrop={(event) => {
            event.preventDefault();
            dropProduct(sectionId, 0);
          }}
          className={`rounded-xl border-2 border-dashed px-4 py-8 text-center text-xs transition ${
            overSection === sectionId
              ? "border-accent text-accent-hover"
              : "border-[#e4e4ec] text-muted"
          }`}
        >
          Drop products here
        </div>
      );
    }
    return (
      <div
        onDragOver={(event) => {
          if (!dragProduct) return;
          event.preventDefault();
          setOverSection(sectionId);
        }}
        onDrop={(event) => {
          event.preventDefault();
          dropProduct(sectionId, items.length);
        }}
        className={`grid gap-5 rounded-xl transition sm:grid-cols-2 lg:grid-cols-3 ${
          overSection === sectionId && dragProduct ? "ring-2 ring-accent/30" : ""
        }`}
      >
        {items.map((product) => renderProduct(product, sectionId))}
      </div>
    );
  }

  return (
    <div className="space-y-10">
      {error && <Alert>{error}</Alert>}

      <p className="text-xs text-muted">
        Drag products to reorder them or move them between sections.
      </p>

      {renderGrid(uncategorizedKey)}

      {orderedCategories.map((category, categoryIndex) => (
              <section key={category.id}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="text-2xl font-semibold tracking-tight">
                      {category.name}
                    </h2>
                    {category.description && (
                      <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
                        {category.description}
                      </p>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-0.5">
                    <button
                      type="button"
                      onClick={() => void moveCategory(category.id, -1)}
                      disabled={busy || categoryIndex === 0}
                      className="grid h-8 w-8 cursor-pointer place-items-center rounded-lg text-muted transition hover:bg-[#f7f7f8] hover:text-foreground disabled:cursor-not-allowed disabled:opacity-30"
                      aria-label={`Move ${category.name} up`}
                    >
                      <ArrowUp size={15} />
                    </button>
                    <button
                      type="button"
                      onClick={() => void moveCategory(category.id, 1)}
                      disabled={
                        busy || categoryIndex === orderedCategories.length - 1
                      }
                      className="grid h-8 w-8 cursor-pointer place-items-center rounded-lg text-muted transition hover:bg-[#f7f7f8] hover:text-foreground disabled:cursor-not-allowed disabled:opacity-30"
                      aria-label={`Move ${category.name} down`}
                    >
                      <ArrowDown size={15} />
                    </button>
                  </div>
                </div>
                <div className="mt-6">{renderGrid(category.id)}</div>
        </section>
      ))}
    </div>
  );
}
