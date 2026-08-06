"use client";

import {
  useRef,
  type KeyboardEvent,
  type ReactNode,
} from "react";

import { cn, type UiControlSize } from "./utils";

export interface SegmentedControlOption<Value extends string = string> {
  value: Value;
  label: ReactNode;
  ariaLabel?: string;
  disabled?: boolean;
}

export interface SegmentedControlProps<Value extends string = string> {
  value: Value;
  options: ReadonlyArray<SegmentedControlOption<Value>>;
  onChange: (value: Value) => void;
  ariaLabel: string;
  className?: string;
  size?: UiControlSize;
}

export function SegmentedControl<Value extends string = string>({
  ariaLabel,
  className,
  onChange,
  options,
  size = "md",
  value,
}: SegmentedControlProps<Value>) {
  const rootRef = useRef<HTMLDivElement>(null);

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    const buttons = Array.from(
      rootRef.current?.querySelectorAll<HTMLButtonElement>("button:not(:disabled)") ?? [],
    );
    if (!buttons.length) return;
    event.preventDefault();
    const currentIndex = buttons.indexOf(event.currentTarget);
    let nextIndex = currentIndex;
    if (event.key === "ArrowLeft") nextIndex = (currentIndex - 1 + buttons.length) % buttons.length;
    if (event.key === "ArrowRight") nextIndex = (currentIndex + 1) % buttons.length;
    if (event.key === "Home") nextIndex = 0;
    if (event.key === "End") nextIndex = buttons.length - 1;
    buttons[nextIndex]?.focus();
    buttons[nextIndex]?.click();
  };

  return (
    <div
      ref={rootRef}
      className={cn(
        "view-toggle",
        "ui-segmented-control",
        `ui-control--${size}`,
        className,
      )}
      data-view={value}
      data-value={value}
      role="group"
      aria-label={ariaLabel}
    >
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <button
            type="button"
            key={option.value}
            className={selected ? "active" : ""}
            aria-label={option.ariaLabel}
            aria-pressed={selected}
            disabled={option.disabled}
            onClick={() => onChange(option.value)}
            onKeyDown={handleKeyDown}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
