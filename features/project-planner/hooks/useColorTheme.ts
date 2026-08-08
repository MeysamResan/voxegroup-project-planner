"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import {
  APP_MOTION_PAUSE_EVENT,
  APP_MOTION_RESUME_EVENT,
} from "@/lib/performance/motion";

export type ColorTheme = "light" | "dark";

const SYSTEM_THEME_QUERY = "(prefers-color-scheme: light)";
const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";
const FALLBACK_TRANSITION_DURATION_MS = 1_250;
const MAX_THEME_TRANSITION_LAYERS = 3;
const MAX_THEME_LAYER_VIEWPORT_RATIO = 0.6;
const THEME_TRANSITION_LAYERS = [
  { selector: ".topbar", name: "theme-topbar" },
  { selector: ".metric-grid", name: "theme-overview" },
  { selector: ".warning-strip", name: "theme-warning" },
  { selector: ".settings-card", name: "theme-settings" },
  { selector: ".phases-card", name: "theme-phases" },
  { selector: ".decision-card", name: "theme-decision" },
  { selector: ".client-sheet", name: "theme-client" },
] as const;

interface ThemeViewTransition {
  finished: Promise<void>;
}

type ThemeTransitionDocument = Document & {
  startViewTransition?: (update: () => void) => ThemeViewTransition;
};

interface PreparedThemeLayer {
  element: HTMLElement;
  previousName: string;
}

const resolveSystemTheme = (query: MediaQueryList): ColorTheme =>
  query.matches ? "light" : "dark";

export interface ColorThemeState {
  theme: ColorTheme;
  usingSystemTheme: boolean;
  toggleTheme: () => void;
  resetTheme: () => void;
}

/**
 * Follows the device color scheme until the user toggles it. The override is
 * intentionally session-only so every refresh starts from the device setting.
 */
export function useColorTheme(): ColorThemeState {
  const [systemTheme, setSystemTheme] = useState<ColorTheme>("dark");
  const [themeOverride, setThemeOverride] = useState<ColorTheme | null>(null);
  const fallbackTimeoutRef = useRef<number | null>(null);
  const motionPausedRef = useRef(false);
  const transitionLayersRef = useRef<PreparedThemeLayer[]>([]);
  const transitionIdRef = useRef(0);
  const theme = themeOverride ?? systemTheme;

  const restoreTransitionLayers = useCallback(() => {
    for (const { element, previousName } of transitionLayersRef.current) {
      element.classList.remove("theme-transition-layer");
      if (previousName) element.style.setProperty("view-transition-name", previousName);
      else element.style.removeProperty("view-transition-name");
    }
    transitionLayersRef.current = [];
  }, []);

  const pauseAppMotion = useCallback(() => {
    if (motionPausedRef.current) return;
    motionPausedRef.current = true;
    window.dispatchEvent(new Event(APP_MOTION_PAUSE_EVENT));
  }, []);

  const resumeAppMotion = useCallback(() => {
    if (!motionPausedRef.current) return;
    motionPausedRef.current = false;
    window.dispatchEvent(new Event(APP_MOTION_RESUME_EVENT));
  }, []);

  const clearTransitionPresentation = useCallback((transitionId?: number) => {
    if (transitionId !== undefined && transitionId !== transitionIdRef.current) return;

    if (fallbackTimeoutRef.current !== null) {
      window.clearTimeout(fallbackTimeoutRef.current);
      fallbackTimeoutRef.current = null;
    }

    const root = document.documentElement;
    root.classList.remove("theme-transition-active", "theme-transition-fallback");
    restoreTransitionLayers();
    resumeAppMotion();
  }, [restoreTransitionLayers, resumeAppMotion]);

  const prepareTransitionLayers = useCallback(() => {
    restoreTransitionLayers();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const maximumLayerArea = viewportWidth * viewportHeight * MAX_THEME_LAYER_VIEWPORT_RATIO;

    // Read every box before writing transition names. This avoids repeated
    // synchronous layout and excludes large or off-screen snapshot surfaces.
    const preparedLayers = THEME_TRANSITION_LAYERS.flatMap(({ selector, name }) => {
      const element = document.querySelector<HTMLElement>(selector);
      if (!element) return [];
      const bounds = element.getBoundingClientRect();
      const intersectsViewport = bounds.right > 0
        && bounds.bottom > 0
        && bounds.left < viewportWidth
        && bounds.top < viewportHeight;
      if (!intersectsViewport || bounds.width * bounds.height > maximumLayerArea) return [];
      const currentName = element.style.getPropertyValue("view-transition-name");

      return [{
        element,
        name,
        previousName: currentName === "active-panel" ? "" : currentName,
      }];
    }).slice(0, MAX_THEME_TRANSITION_LAYERS);

    for (const { element, name } of preparedLayers) {
      element.classList.add("theme-transition-layer");
      element.style.setProperty("view-transition-name", name);
    }

    transitionLayersRef.current = preparedLayers;
  }, [restoreTransitionLayers]);

  useEffect(() => {
    const query = window.matchMedia(SYSTEM_THEME_QUERY);
    const syncSystemTheme = () => setSystemTheme(resolveSystemTheme(query));

    syncSystemTheme();
    query.addEventListener("change", syncSystemTheme);
    return () => query.removeEventListener("change", syncSystemTheme);
  }, []);

  useEffect(
    () => () => {
      transitionIdRef.current += 1;
      clearTransitionPresentation();
      delete document.documentElement.dataset.theme;
    },
    [clearTransitionPresentation],
  );

  const applyOverride = useCallback((nextTheme: ColorTheme | null) => {
    if (nextTheme) document.documentElement.dataset.theme = nextTheme;
    else delete document.documentElement.dataset.theme;
    setThemeOverride(nextTheme);
  }, []);

  const toggleTheme = useCallback(() => {
    const nextTheme = theme === "dark" ? "light" : "dark";

    transitionIdRef.current += 1;
    clearTransitionPresentation();

    if (window.matchMedia(REDUCED_MOTION_QUERY).matches) {
      applyOverride(nextTheme);
      return;
    }

    pauseAppMotion();
    const transitionId = transitionIdRef.current;
    const root = document.documentElement;
    const finishTransition = () => clearTransitionPresentation(transitionId);
    const runFallbackTransition = () => {
      root.classList.remove("theme-transition-active");
      root.classList.add("theme-transition-fallback");
      applyOverride(nextTheme);
      fallbackTimeoutRef.current = window.setTimeout(
        finishTransition,
        FALLBACK_TRANSITION_DURATION_MS,
      );
    };
    const transitionDocument = document as ThemeTransitionDocument;

    prepareTransitionLayers();

    if (typeof transitionDocument.startViewTransition !== "function") {
      runFallbackTransition();
      return;
    }

    root.classList.add("theme-transition-active");
    try {
      const transition = transitionDocument.startViewTransition(() => {
        applyOverride(nextTheme);
      });
      void transition.finished.then(finishTransition, finishTransition);
    } catch {
      runFallbackTransition();
    }
  }, [
    applyOverride,
    clearTransitionPresentation,
    pauseAppMotion,
    prepareTransitionLayers,
    theme,
  ]);

  const resetTheme = useCallback(() => {
    transitionIdRef.current += 1;
    clearTransitionPresentation();
    applyOverride(null);
  }, [applyOverride, clearTransitionPresentation]);

  return {
    theme,
    usingSystemTheme: themeOverride === null,
    toggleTheme,
    resetTheme,
  };
}
