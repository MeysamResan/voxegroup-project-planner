"use client";

import {
  forwardRef,
  type ButtonHTMLAttributes,
  type ReactNode,
} from "react";

import { cn, type UiControlSize } from "./utils";

export type IconButtonVariant = "default" | "accent" | "ghost" | "danger";

export interface IconButtonProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "aria-label" | "children"> {
  label: string;
  children: ReactNode;
  variant?: IconButtonVariant;
  size?: UiControlSize;
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  function IconButton(
    {
      children,
      className,
      label,
      size = "md",
      title,
      type = "button",
      variant = "default",
      ...props
    },
    ref,
  ) {
    return (
      <button
        {...props}
        ref={ref}
        type={type}
        aria-label={label}
        title={title ?? label}
        className={cn(
          "icon-button",
          "ui-icon-button",
          `ui-icon-button--${variant}`,
          `ui-control--${size}`,
          variant === "accent" && "accent",
          variant === "danger" && "danger",
          className,
        )}
      >
        {children}
      </button>
    );
  },
);
