"use client";

import { createContext, useContext } from "react";
import type { TablePreferences } from "@/lib/table-preferences.types";

const TablePreferencesContext = createContext<TablePreferences>({});

export function TablePreferencesProvider({
  preferences,
  children,
}: {
  preferences: TablePreferences;
  children: React.ReactNode;
}) {
  return (
    <TablePreferencesContext.Provider value={preferences}>
      {children}
    </TablePreferencesContext.Provider>
  );
}

export function useInitialTablePreferences() {
  return useContext(TablePreferencesContext);
}
