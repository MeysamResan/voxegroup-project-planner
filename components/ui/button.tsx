"use client";

import {
  forwardRef,
  type ButtonHTMLAttributes,
  type ReactNode,
} from "react";

import { cn, type UiControlSize } from "./utils";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: ButtonVariant;
  size?: UiControlSize;
  fullWidth?: boolean;
  loading?: boolean;
  leadingIcon?: ReactNode;
  trailingIcon?: ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    children,
    className,
    disabled,
    fullWidth = false,
    leadingIcon,
    loading = false,
    size = "md",
    trailingIcon,
    type = "button",
    variant = "secondary",
    ...props
  },
  ref,
) {
  return (
    <button
      {...props}
      ref={ref}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(
        "button",
        "ui-button",
        `ui-button--${variant}`,
        `ui-control--${size}`,
        variant === "primary" && "primary",
        variant === "secondary" && "secondary",
        variant === "danger" && "danger-button",
        fullWidth && "ui-button--full-width",
        className,
      )}
    >
      {leadingIcon && <span className="ui-button__icon" aria-hidden="true">{leadingIcon}</span>}
      <span className="ui-button__label">{children}</span>
      {trailingIcon && <span className="ui-button__icon" aria-hidden="true">{trailingIcon}</span>}
    </button>
  );
});
