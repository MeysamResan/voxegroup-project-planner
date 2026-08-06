"use client";

import {
  useState,
  type InputHTMLAttributes,
  type ReactNode,
} from "react";
import { Minus, Plus } from "lucide-react";

import { cn, type UiControlSize } from "./utils";

export interface NumberStepperProps
  extends Omit<
    InputHTMLAttributes<HTMLInputElement>,
    "className" | "onChange" | "size" | "type" | "value"
  > {
  value: number;
  onChange: (value: number) => void;
  ariaLabel: string;
  suffix?: ReactNode;
  min?: number;
  max?: number;
  step?: number;
  compact?: boolean;
  size?: UiControlSize;
  className?: string;
  inputClassName?: string;
}

function normalizeValue(value: number, min?: number, max?: number): number {
  const bounded = Math.min(
    max ?? Number.POSITIVE_INFINITY,
    Math.max(min ?? Number.NEGATIVE_INFINITY, value),
  );
  return Math.round((bounded + Number.EPSILON) * 10000) / 10000;
}

export function NumberStepper({
  ariaLabel,
  className,
  compact = false,
  disabled = false,
  inputClassName,
  max,
  min,
  onChange,
  size,
  step = 1,
  suffix,
  value,
  ...inputProps
}: NumberStepperProps) {
  const [draft, setDraft] = useState(String(value));
  const [editing, setEditing] = useState(false);
  const resolvedSize = size ?? (compact ? "sm" : "md");

  const commit = (nextValue: number) => {
    const normalized = normalizeValue(nextValue, min, max);
    setDraft(String(normalized));
    onChange(normalized);
  };

  const stepBy = (direction: -1 | 1) => {
    const current = editing ? Number(draft) : value;
    commit((Number.isFinite(current) ? current : value) + step * direction);
  };

  return (
    <div
      className={cn(
        "number-stepper",
        "ui-number-stepper",
        `ui-control--${resolvedSize}`,
        compact && "compact-stepper",
        className,
      )}
    >
      <button
        type="button"
        onClick={() => stepBy(-1)}
        disabled={disabled || (min !== undefined && value <= min)}
        aria-label={`Decrease ${ariaLabel}`}
      >
        <Minus size={resolvedSize === "sm" ? 13 : 15} aria-hidden="true" />
      </button>
      <input
        {...inputProps}
        className={inputClassName}
        type="number"
        inputMode="decimal"
        aria-label={ariaLabel}
        value={editing ? draft : String(value)}
        min={min}
        max={max}
        step={step}
        disabled={disabled}
        onFocus={(event) => {
          setDraft(String(value));
          setEditing(true);
          inputProps.onFocus?.(event);
        }}
        onChange={(event) => {
          const nextDraft = event.target.value;
          setDraft(nextDraft);
          const parsed = Number(nextDraft);
          if (nextDraft !== "" && nextDraft !== "-" && Number.isFinite(parsed)) onChange(parsed);
        }}
        onBlur={(event) => {
          const parsed = Number(draft);
          commit(Number.isFinite(parsed) ? parsed : value);
          setEditing(false);
          inputProps.onBlur?.(event);
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter") event.currentTarget.blur();
          inputProps.onKeyDown?.(event);
        }}
      />
      {suffix && <em className="ui-number-stepper__suffix">{suffix}</em>}
      <button
        type="button"
        onClick={() => stepBy(1)}
        disabled={disabled || (max !== undefined && value >= max)}
        aria-label={`Increase ${ariaLabel}`}
      >
        <Plus size={resolvedSize === "sm" ? 13 : 15} aria-hidden="true" />
      </button>
    </div>
  );
}
