"use client";

import {
  forwardRef,
  type ButtonHTMLAttributes,
  type ReactNode,
} from "react";

import { cn } from "./utils";

export interface ActionCardProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children" | "title"> {
  title: ReactNode;
  description: ReactNode;
  icon: ReactNode;
}

/** Large, descriptive action used when a compact button is not expressive enough. */
export const ActionCard = forwardRef<HTMLButtonElement, ActionCardProps>(
  function ActionCard(
    { className, description, icon, title, type = "button", ...props },
    ref,
  ) {
    return (
      <button
        {...props}
        ref={ref}
        type={type}
        className={cn("export-choice", "ui-action-card", className)}
      >
        <span className="export-choice-icon ui-action-card__icon" aria-hidden="true">
          {icon}
        </span>
        <span className="ui-action-card__copy">
          <strong>{title}</strong>
          <small>{description}</small>
        </span>
      </button>
    );
  },
);
