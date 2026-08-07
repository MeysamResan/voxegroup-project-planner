"use client";

import {
  useEffect,
  useReducer,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";

import {
  PLANNING_MODE_KEY,
  STORAGE_KEY,
  initialWorkspace,
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

/**
 * Owns session-only workspace state.
 * Every page load starts from the built-in preset with pricing visible.
 */
export function usePricingWorkspace(): PricingWorkspaceState {
  const [workspace, dispatch] = useReducer(workspaceReducer, undefined, initialWorkspace);
  const [hydrated, setHydrated] = useState(false);
  const [planningMode, setPlanningMode] = useState(false);

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;

      // Remove data written by older releases without touching unrelated
      // storage owned by the same origin. This app never reads or persists
      // workspace state there.
      try {
        localStorage.removeItem(STORAGE_KEY);
        localStorage.removeItem(PLANNING_MODE_KEY);
      } catch {
        // Storage access can be blocked; state is session-only regardless.
      }

      setHydrated(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return {
    workspace,
    dispatch,
    hydrated,
    planningMode,
    setPlanningMode,
  };
}

const LEGACY_CACHE_PREFIX = "voxe-pricing-studio-v";
const LEGACY_SERVICE_WORKER_PATH = "/sw.js";

const isLegacyServiceWorker = (registration: ServiceWorkerRegistration): boolean =>
  [registration.installing, registration.waiting, registration.active].some((worker) => {
    if (!worker) return false;
    try {
      return new URL(worker.scriptURL).pathname === LEGACY_SERVICE_WORKER_PATH;
    } catch {
      return false;
    }
  });

/** Removes the retired offline shell so refreshes always load the current application. */
export function useLegacyBrowserCleanup(): void {
  useEffect(() => {
    const clearLegacyBrowserState = async () => {
      if ("serviceWorker" in navigator) {
        try {
          const registrations = await navigator.serviceWorker.getRegistrations();
          await Promise.all(
            registrations
              .filter(isLegacyServiceWorker)
              .map((registration) => registration.unregister().catch(() => false)),
          );
        } catch {
          // A restricted browser context may not expose registrations.
        }
      }

      if ("caches" in window) {
        try {
          const cacheNames = await window.caches.keys();
          await Promise.all(
            cacheNames
              .filter((cacheName) => cacheName.startsWith(LEGACY_CACHE_PREFIX))
              .map((cacheName) => window.caches.delete(cacheName)),
          );
        } catch {
          // Cache Storage can be unavailable in private or restricted contexts.
        }
      }
    };

    void clearLegacyBrowserState();
  }, []);
}
