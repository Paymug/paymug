"use client";

import {
  createContext,
  useContext,
  useState,
  type ReactNode,
} from "react";

interface DashboardShellContextValue {
  collapsed: boolean;
  toggle(): void;
}

const DashboardShellContext = createContext<DashboardShellContextValue>({
  collapsed: false,
  toggle() {},
});

export function useDashboardShell(): DashboardShellContextValue {
  return useContext(DashboardShellContext);
}

export function DashboardShell({
  nav,
  topbar,
  children,
}: {
  nav: ReactNode;
  topbar: ReactNode;
  children: ReactNode;
}) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <DashboardShellContext.Provider
      value={{ collapsed, toggle: () => setCollapsed((value) => !value) }}
    >
      <div
        className={`grid min-h-dvh grid-cols-[minmax(0,1fr)] grid-rows-[auto_auto_minmax(0,1fr)] overflow-x-clip bg-white text-[#333] transition-[grid-template-columns] duration-300 ease-out [--background:#fff] [--border:#e8e8ee] [--card:#fff] [--foreground:#27272f] [--muted:#85859d] lg:grid-rows-[5.5rem_minmax(0,1fr)] ${
          collapsed
            ? "lg:grid-cols-[4.5rem_minmax(0,1fr)]"
            : "lg:grid-cols-[15rem_minmax(0,1fr)]"
        }`}
      >
        {nav}
        {topbar}
        {children}
      </div>
    </DashboardShellContext.Provider>
  );
}
