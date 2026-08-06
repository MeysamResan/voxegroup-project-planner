"use client";

import {
  type ButtonHTMLAttributes,
  type ReactNode,
} from "react";

import { cn, type UiControlSize } from "./utils";

export interface SwitchProps
  extends Omit<
    ButtonHTMLAttributes<HTMLButtonElement>,
    "aria-checked" | "onChange" | "onClick" | "role"
  > {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  label: ReactNode;
  ariaLabel: string;
  checkedDescription?: ReactNode;
  uncheckedDescription?: ReactNode;
  checkedIcon?: ReactNode;
  uncheckedIcon?: ReactNode;
  size?: UiControlSize;
}

export function Switch({
  ariaLabel,
  checked,
  checkedDescription,
  checkedIcon,
  className,
  disabled,
  label,
  onCheckedChange,
  size = "md",
  title,
  type = "button",
  uncheckedDescription,
  uncheckedIcon,
  ...props
}: SwitchProps) {
  const description = checked ? checkedDescription : uncheckedDescription;
  const icon = checked ? checkedIcon : uncheckedIcon;
  return (
    <button
      {...props}
      type={type}
      className={cn(
        "privacy-switch",
        "ui-switch",
        `ui-control--${size}`,
        checked && "active",
        className,
      )}
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      title={title ?? ariaLabel}
      disabled={disabled}
      onClick={() => onCheckedChange(!checked)}
    >
      {icon && <span className="privacy-switch-icon ui-switch__icon" aria-hidden="true">{icon}</span>}
      <span className="privacy-switch-copy ui-switch__copy">
        <strong>{label}</strong>
        {description && <small>{description}</small>}
      </span>
      <span className="privacy-switch-track ui-switch__track" aria-hidden="true" />
    </button>
  );
}
