"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import {
  APP_MOTION_PAUSE_EVENT,
  APP_MOTION_RESUME_EVENT,
} from "@/lib/performance/motion";

export type ColorTheme = "light" | "dark";

const SYSTEM_THEME_QUERY = "(prefers-color-scheme: light)";
const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

interface ThemeViewTransition {
  finished: Promise<void>;
}

type ThemeTransitionDocument = Document & {
  startViewTransition?: (update: () => void) => ThemeViewTransition;
};

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
  const motionPausedRef = useRef(false);
  const transitionIdRef = useRef(0);
  const theme = themeOverride ?? systemTheme;

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

  const clearThemeTransition = useCallback((transitionId?: number) => {
    if (transitionId !== undefined && transitionId !== transitionIdRef.current) return;
    document.documentElement.classList.remove("theme-transition-active");
    resumeAppMotion();
  }, [resumeAppMotion]);

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
      clearThemeTransition();
      delete document.documentElement.dataset.theme;
    },
    [clearThemeTransition],
  );

  const applyOverride = useCallback((nextTheme: ColorTheme | null) => {
    if (nextTheme) document.documentElement.dataset.theme = nextTheme;
    else delete document.documentElement.dataset.theme;
    setThemeOverride(nextTheme);
  }, []);

  const toggleTheme = useCallback(() => {
    const nextTheme = theme === "dark" ? "light" : "dark";

    transitionIdRef.current += 1;
    clearThemeTransition();

    if (window.matchMedia(REDUCED_MOTION_QUERY).matches) {
      applyOverride(nextTheme);
      return;
    }

    const transitionId = transitionIdRef.current;
    const root = document.documentElement;
    const finishTransition = () => clearThemeTransition(transitionId);
    const transitionDocument = document as ThemeTransitionDocument;

    pauseAppMotion();
    if (typeof transitionDocument.startViewTransition !== "function") {
      applyOverride(nextTheme);
      finishTransition();
      return;
    }

    root.classList.add("theme-transition-active");
    try {
      const transition = transitionDocument.startViewTransition(() => {
        applyOverride(nextTheme);
      });
      void transition.finished.then(finishTransition, finishTransition);
    } catch {
      finishTransition();
      applyOverride(nextTheme);
    }
  }, [applyOverride, clearThemeTransition, pauseAppMotion, theme]);

  const resetTheme = useCallback(() => {
    transitionIdRef.current += 1;
    clearThemeTransition();
    applyOverride(null);
  }, [applyOverride, clearThemeTransition]);

  return {
    theme,
    usingSystemTheme: themeOverride === null,
    toggleTheme,
    resetTheme,
  };
}
