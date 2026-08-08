"use client";

import { useCallback, useEffect, useRef } from "react";
import { flushSync } from "react-dom";

export type WorkspaceTransitionDirection = "forward" | "backward";

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";
const WORKSPACE_CONTENT_SELECTOR = ".workspace-content";
const WORKSPACE_TRANSITION_DURATION_MS = 360;
const WORKSPACE_TRANSITION_EASING = "cubic-bezier(0.22, 1, 0.36, 1)";

export function useWorkspaceTransition() {
  const animationRef = useRef<Animation | null>(null);

  const clearWorkspaceTransition = useCallback(() => {
    animationRef.current?.cancel();
    animationRef.current = null;
  }, []);

  useEffect(() => clearWorkspaceTransition, [clearWorkspaceTransition]);

  return useCallback((update: () => void, direction: WorkspaceTransitionDirection) => {
    clearWorkspaceTransition();
    const content = document.querySelector<HTMLElement>(WORKSPACE_CONTENT_SELECTOR);

    flushSync(update);
    if (
      !content
      || typeof content.animate !== "function"
      || window.matchMedia(REDUCED_MOTION_QUERY).matches
    ) return;

    const offset = direction === "forward" ? 14 : -14;
    const animation = content.animate(
      [
        { opacity: 0.42, transform: `translate3d(${offset}px, 0, 0)` },
        { opacity: 1, transform: "translate3d(0, 0, 0)" },
      ],
      {
        duration: WORKSPACE_TRANSITION_DURATION_MS,
        easing: WORKSPACE_TRANSITION_EASING,
        fill: "both",
      },
    );
    animationRef.current = animation;

    const releaseAnimation = () => {
      if (animationRef.current !== animation) return;
      animation.cancel();
      animationRef.current = null;
    };
    void animation.finished.then(releaseAnimation, releaseAnimation);
  }, [clearWorkspaceTransition]);
}
