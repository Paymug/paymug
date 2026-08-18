"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type {
  ProductAutosaveStatus,
  ProductSaveResponse,
  UseProductAutosaveInput,
} from "./product-autosave.types";

export function useProductAutosave({
  initialProductId,
  payload,
  hasMeaningfulContent,
  onCreated,
  onError,
  onSaved,
}: UseProductAutosaveInput) {
  const productIdRef = useRef(initialProductId);
  const payloadRef = useRef(payload);
  const meaningfulContentRef = useRef(hasMeaningfulContent);
  const onCreatedRef = useRef(onCreated);
  const onErrorRef = useRef(onError);
  const onSavedRef = useRef(onSaved);
  const queueRef = useRef<Promise<void>>(Promise.resolve());
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [productId, setProductId] = useState(initialProductId);
  const [status, setStatus] = useState<ProductAutosaveStatus>("idle");

  payloadRef.current = payload;
  meaningfulContentRef.current = hasMeaningfulContent;
  onCreatedRef.current = onCreated;
  onErrorRef.current = onError;
  onSavedRef.current = onSaved;

  const enqueueAutosave = useCallback(() => {
    if (!productIdRef.current && !meaningfulContentRef.current) {
      return queueRef.current;
    }

    queueRef.current = queueRef.current.then(async () => {
      setStatus("saving");
      const existingProductId = productIdRef.current;
      const response = await fetch(
        existingProductId
          ? `/api/products/${existingProductId}`
          : "/api/products",
        {
          method: existingProductId ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(
            existingProductId
              ? payloadRef.current
              : { ...payloadRef.current, status: "draft" },
          ),
        },
      );
      const data = (await response.json()) as ProductSaveResponse;
      if (!response.ok || !data.product) {
        throw new Error(data.error || "Could not autosave product");
      }
      if (!existingProductId) {
        productIdRef.current = data.product.id;
        setProductId(data.product.id);
        onCreatedRef.current(data.product);
      }
      onSavedRef.current();
      setStatus("saved");
    }).catch((error) => {
      setStatus("error");
      onErrorRef.current(
        error instanceof Error ? error.message : "Could not autosave product",
      );
    });

    return queueRef.current;
  }, []);

  const requestAutosave = useCallback(
    (delay = 0) => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (delay <= 0) {
        timerRef.current = null;
        void enqueueAutosave();
        return;
      }
      timerRef.current = setTimeout(() => {
        timerRef.current = null;
        void enqueueAutosave();
      }, delay);
    },
    [enqueueAutosave],
  );

  const waitForAutosave = useCallback(async () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    await queueRef.current;
    return productIdRef.current;
  }, []);

  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    },
    [],
  );

  return { productId, status, requestAutosave, waitForAutosave };
}
