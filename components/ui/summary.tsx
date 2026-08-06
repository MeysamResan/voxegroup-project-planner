import {
  type HTMLAttributes,
  type ReactNode,
} from "react";

import { cn } from "./utils";

export type SummaryTone = "default" | "featured" | "green" | "violet" | "orange" | "danger";
export type SummaryColumns = 2 | 3 | 4 | 5 | 6 | "auto";

export interface SummaryGridProps extends HTMLAttributes<HTMLElement> {
  children: ReactNode;
  ariaLabel?: string;
  columns?: SummaryColumns;
  compact?: boolean;
  as?: "div" | "section" | "ul";
}

export function SummaryGrid({
  ariaLabel,
  as: Element = "div",
  children,
  className,
  columns = "auto",
  compact = false,
  role,
  ...props
}: SummaryGridProps) {
  return (
    <Element
      {...props}
      className={cn(
        "ui-summary-grid",
        `ui-summary-grid--${columns}`,
        compact && "ui-summary-grid--compact",
        className,
      )}
      aria-label={ariaLabel}
      role={role ?? (ariaLabel && Element === "div" ? "group" : undefined)}
    >
      {children}
    </Element>
  );
}

export interface SummaryCardProps extends Omit<HTMLAttributes<HTMLElement>, "title"> {
  label: ReactNode;
  value: ReactNode;
  detail?: ReactNode;
  icon?: ReactNode;
  tone?: SummaryTone;
  iconClassName?: string;
  copyClassName?: string;
  labelClassName?: string;
  valueClassName?: string;
  detailClassName?: string;
  decoration?: ReactNode;
  flat?: boolean;
  as?: "article" | "div" | "li";
}

export function SummaryCard({
  as: Element = "article",
  className,
  copyClassName,
  decoration,
  detail,
  detailClassName,
  icon,
  iconClassName,
  label,
  labelClassName,
  flat = false,
  tone = "default",
  value,
  valueClassName,
  ...props
}: SummaryCardProps) {
  return (
    <Element
      {...props}
      className={cn(
        "ui-summary-card",
        `ui-summary-card--${tone}`,
        tone === "featured" && "featured",
        className,
      )}
    >
      {icon && (
        <span className={cn("ui-summary-card__icon", iconClassName)} aria-hidden="true">
          {icon}
        </span>
      )}
      {flat ? (
        <>
          <span className={cn("ui-summary-card__label", labelClassName)}>{label}</span>
          <strong className={cn("ui-summary-card__value", valueClassName)}>{value}</strong>
          {detail && <small className={cn("ui-summary-card__detail", detailClassName)}>{detail}</small>}
        </>
      ) : (
        <div className={cn("ui-summary-card__copy", copyClassName)}>
          <span className={cn("ui-summary-card__label", labelClassName)}>{label}</span>
          <strong className={cn("ui-summary-card__value", valueClassName)}>{value}</strong>
          {detail && <small className={cn("ui-summary-card__detail", detailClassName)}>{detail}</small>}
        </div>
      )}
      {decoration}
    </Element>
  );
}
