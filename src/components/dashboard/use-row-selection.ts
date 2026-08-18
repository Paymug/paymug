import { useEffect, useRef, useState } from "react";
import type { RowSelectionState } from "./row-selection.types";

export function useRowSelection(ids: string[]): RowSelectionState {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const anchorIndex = useRef<number | null>(null);
  const dragging = useRef(false);
  const dragValue = useRef(true);

  useEffect(() => {
    const endDrag = () => {
      dragging.current = false;
    };
    window.addEventListener("mouseup", endDrag);
    return () => window.removeEventListener("mouseup", endDrag);
  }, []);

  useEffect(() => {
    const available = new Set(ids);
    setSelectedIds(
      (current) => new Set([...current].filter((id) => available.has(id)))
    );
  }, [ids.join("|")]);

  function toggle(id: string, index: number, shiftKey: boolean) {
    setSelectedIds((current) => {
      const next = new Set(current);
      const shouldSelect = !current.has(id);
      if (shiftKey && anchorIndex.current !== null) {
        const start = Math.min(anchorIndex.current, index);
        const end = Math.max(anchorIndex.current, index);
        ids.slice(start, end + 1).forEach((rangeId) => {
          if (shouldSelect) next.add(rangeId);
          else next.delete(rangeId);
        });
      } else if (shouldSelect) {
        next.add(id);
      } else {
        next.delete(id);
      }
      return next;
    });
    anchorIndex.current = index;
  }

  function toggleAll() {
    setSelectedIds((current) =>
      current.size === ids.length ? new Set() : new Set(ids)
    );
  }

  function beginDrag(id: string) {
    dragging.current = true;
    dragValue.current = !selectedIds.has(id);
  }

  function enterDrag(id: string) {
    if (!dragging.current) return;
    setSelectedIds((current) => {
      const next = new Set(current);
      if (dragValue.current) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  return {
    selectedIds,
    hasSelection: selectedIds.size > 0,
    isSelected: (id) => selectedIds.has(id),
    toggle,
    toggleAll,
    beginDrag,
    enterDrag,
  };
}
