"use client";

import {
  useEffect,
  useReducer,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";

import {
  PLANNING_MODE_KEY,
  STORAGE_KEY,
  initialWorkspace,
  normalizeWorkspace,
  parsePlanningMode,
  workspaceActions,
  workspaceReducer,
  type Workspace,
  type WorkspaceAction,
} from "@/lib/pricing";

export interface PricingWorkspaceState {
  workspace: Workspace;
  dispatch: Dispatch<WorkspaceAction>;
  hydrated: boolean;
  planningMode: boolean;
  setPlanningMode: Dispatch<SetStateAction<boolean>>;
}

export interface UsePricingWorkspaceOptions {
  onPersistenceError?: () => void;
}

/**
 * Owns browser hydration and local persistence for the pricing workspace.
 * Privacy is fail-closed: malformed or missing state always starts in Planning mode.
 */
export function usePricingWorkspace(
  options: UsePricingWorkspaceOptions = {},
): PricingWorkspaceState {
  const [workspace, dispatch] = useReducer(workspaceReducer, undefined, initialWorkspace);
  const [hydrated, setHydrated] = useState(false);
  const [planningMode, setPlanningMode] = useState(true);
  const errorHandlerRef = useRef(options.onPersistenceError);

  useEffect(() => {
    errorHandlerRef.current = options.onPersistenceError;
  }, [options.onPersistenceError]);

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      try {
        setPlanningMode(parsePlanningMode(localStorage.getItem(PLANNING_MODE_KEY)));
        const savedWorkspace = localStorage.getItem(STORAGE_KEY);
        if (savedWorkspace) {
          const normalized = normalizeWorkspace(JSON.parse(savedWorkspace) as unknown);
          if (normalized) dispatch(workspaceActions.replaceWorkspace(normalized));
        }
      } catch {
        errorHandlerRef.current?.();
      } finally {
        setHydrated(true);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(workspace));
    } catch {
      errorHandlerRef.current?.();
    }
  }, [hydrated, workspace]);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(PLANNING_MODE_KEY, String(planningMode));
    } catch {
      errorHandlerRef.current?.();
    }
  }, [hydrated, planningMode]);

  return {
    workspace,
    dispatch,
    hydrated,
    planningMode,
    setPlanningMode,
  };
}

/** Registers the optional offline shell only in browser contexts that permit it. */
export function useOfflineSupport(): void {
  useEffect(() => {
    const trustedLocal =
      window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1";
    if (
      "serviceWorker" in navigator &&
      (window.location.protocol === "https:" || trustedLocal)
    ) {
      void navigator.serviceWorker.register("/sw.js").catch(() => undefined);
    }
  }, []);
}
