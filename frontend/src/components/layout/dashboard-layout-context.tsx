"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type DashboardMeta = {
  title: string;
  subtitle: string;
};

type DashboardLayoutContextValue = {
  meta: DashboardMeta;
  setMeta: (meta: DashboardMeta) => void;
};

const DashboardLayoutContext = createContext<DashboardLayoutContextValue | null>(null);

export function DashboardLayoutProvider({
  children,
  initialMeta,
}: {
  children: ReactNode;
  initialMeta?: DashboardMeta;
}) {
  const [meta, setMetaState] = useState<DashboardMeta>(
    initialMeta ?? { title: "", subtitle: "" }
  );

  const setMeta = useCallback((next: DashboardMeta) => {
    setMetaState((prev) => {
      if (prev.title === next.title && prev.subtitle === next.subtitle) {
        return prev;
      }
      return next;
    });
  }, []);

  const value = useMemo(() => ({ meta, setMeta }), [meta, setMeta]);

  return (
    <DashboardLayoutContext.Provider value={value}>
      {children}
    </DashboardLayoutContext.Provider>
  );
}

export function useDashboardLayoutContext() {
  return useContext(DashboardLayoutContext);
}
