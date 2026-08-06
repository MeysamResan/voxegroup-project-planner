"use client";

import { flushSync } from "react-dom";
import { Maximize2, Minimize2 } from "lucide-react";

import { IconButton } from "./icon-button";

export interface PanelSizeButtonProps {
  label: string;
  maximized: boolean;
  onToggle: () => void;
  className?: string;
}

export function runPanelViewTransition(update: () => void): void {
  if (
    typeof document === "undefined" ||
    typeof window === "undefined" ||
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  ) {
    update();
    return;
  }

  const transitionDocument = document as Document & {
    startViewTransition?: (callback: () => void) => { finished: Promise<void> };
  };
  if (!transitionDocument.startViewTransition) {
    update();
    return;
  }

  try {
    const transition = transitionDocument.startViewTransition(() => flushSync(update));
    void transition.finished.catch(() => undefined);
  } catch {
    update();
  }
}

export function PanelSizeButton({
  className,
  label,
  maximized,
  onToggle,
}: PanelSizeButtonProps) {
  const action = maximized ? "Minimize" : "Maximize";
  return (
    <IconButton
      className={`panel-size-button${className ? ` ${className}` : ""}`}
      label={`${action} ${label}`}
      aria-pressed={maximized}
      onClick={onToggle}
    >
      {maximized
        ? <Minimize2 size={16} aria-hidden="true" />
        : <Maximize2 size={16} aria-hidden="true" />}
    </IconButton>
  );
}
