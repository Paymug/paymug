"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import type { TablePreference } from "@/lib/table-preferences.types";
import { useInitialTablePreferences } from "./TablePreferencesProvider";
import type { DataTableColumn } from "./data-table.types";

const defaultMinColumnWidth = 60;

interface DataTableOptions {
  /** Width of a fixed column rendered before the managed columns (px). */
  leadingWidth?: number;
  /** Minimum width of the trailing column holding the columns menu (px). */
  trailingWidth?: number;
}

export function useDataTable(
  tableId: string,
  columns: DataTableColumn[],
  { leadingWidth = 0, trailingWidth = 48 }: DataTableOptions = {},
) {
  const initial = useInitialTablePreferences()[tableId];
  const [hidden, setHidden] = useState<string[]>(initial?.hidden ?? []);
  const [widths, setWidths] = useState<Record<string, number>>(
    initial?.widths ?? {},
  );
  const latest = useRef<TablePreference>({ hidden, widths });

  const persist = useCallback(
    (next: TablePreference) => {
      latest.current = next;
      void fetch("/api/table-preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tableId, ...next }),
      }).catch(() => {
        // The in-memory layout still works when saving fails.
      });
    },
    [tableId],
  );

  const visibleColumns = useMemo(
    () => columns.filter((column) => !hidden.includes(column.id)),
    [columns, hidden],
  );

  const getWidth = useCallback(
    (column: DataTableColumn) =>
      Math.max(
        column.minWidth ?? defaultMinColumnWidth,
        widths[column.id] ?? column.width,
      ),
    [widths],
  );

  const toggleColumn = useCallback(
    (id: string) => {
      const next = hidden.includes(id)
        ? hidden.filter((value) => value !== id)
        : columns.length - hidden.length > 1
          ? [...hidden, id]
          : hidden;
      if (next === hidden) return;
      setHidden(next);
      persist({ hidden: next, widths: latest.current.widths });
    },
    [columns.length, hidden, persist],
  );

  const resetColumns = useCallback(() => {
    setHidden([]);
    setWidths({});
    persist({ hidden: [], widths: {} });
  }, [persist]);

  const previewWidth = useCallback((id: string, width: number) => {
    setWidths((current) => ({ ...current, [id]: width }));
    latest.current = {
      hidden: latest.current.hidden,
      widths: { ...latest.current.widths, [id]: width },
    };
  }, []);

  const commitWidths = useCallback(() => {
    persist({ hidden: latest.current.hidden, widths: latest.current.widths });
  }, [persist]);

  const tableStyle = useMemo(
    () => ({
      tableLayout: "fixed" as const,
      width: "100%",
      minWidth:
        visibleColumns.reduce((total, column) => total + getWidth(column), 0) +
        leadingWidth +
        trailingWidth,
    }),
    [getWidth, leadingWidth, trailingWidth, visibleColumns],
  );

  return {
    columns,
    leadingWidth,
    visibleColumns,
    hidden,
    isVisible: (id: string) => !hidden.includes(id),
    getWidth,
    toggleColumn,
    resetColumns,
    previewWidth,
    commitWidths,
    tableStyle,
  };
}

export type DataTableState = ReturnType<typeof useDataTable>;
