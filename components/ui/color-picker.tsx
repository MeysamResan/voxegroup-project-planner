"use client";

import {
  useRef,
  type KeyboardEvent,
} from "react";
import { Check } from "lucide-react";

import { cn } from "./utils";

export interface ColorOption<Value extends string = string> {
  value: Value;
  label?: string;
  disabled?: boolean;
}

export interface ColorPickerProps<Value extends string = string> {
  value: Value;
  options: ReadonlyArray<ColorOption<Value>>;
  onChange: (value: Value) => void;
  label: string;
  className?: string;
}

export function ColorPicker<Value extends string = string>({
  className,
  label,
  onChange,
  options,
  value,
}: ColorPickerProps<Value>) {
  const optionsRef = useRef<HTMLDivElement>(null);
  const hasSelectedOption = options.some((option) => option.value === value && !option.disabled);
  const firstEnabledValue = options.find((option) => !option.disabled)?.value;

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End"].includes(event.key)) {
      return;
    }
    const buttons = Array.from(
      optionsRef.current?.querySelectorAll<HTMLButtonElement>('button[role="radio"]:not(:disabled)') ?? [],
    );
    if (!buttons.length) return;
    event.preventDefault();
    const currentIndex = buttons.indexOf(event.currentTarget);
    const backwards = event.key === "ArrowLeft" || event.key === "ArrowUp";
    const forwards = event.key === "ArrowRight" || event.key === "ArrowDown";
    let nextIndex = currentIndex;
    if (backwards) nextIndex = (currentIndex - 1 + buttons.length) % buttons.length;
    if (forwards) nextIndex = (currentIndex + 1) % buttons.length;
    if (event.key === "Home") nextIndex = 0;
    if (event.key === "End") nextIndex = buttons.length - 1;
    buttons[nextIndex]?.focus();
    buttons[nextIndex]?.click();
  };

  return (
    <div className={cn("color-picker", "ui-color-picker", className)}>
      <span>{label}</span>
      <div ref={optionsRef} role="radiogroup" aria-label={label}>
        {options.map((option) => {
          const selected = option.value === value;
          return (
            <button
              type="button"
              role="radio"
              key={option.value}
              className={selected ? "active" : ""}
              style={{ background: option.value }}
              aria-label={option.label ?? option.value}
              aria-checked={selected}
              disabled={option.disabled}
              tabIndex={selected || (!hasSelectedOption && option.value === firstEnabledValue) ? 0 : -1}
              onClick={() => onChange(option.value)}
              onKeyDown={handleKeyDown}
            >
              {selected && <Check size={12} aria-hidden="true" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}
