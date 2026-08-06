import {
  createElement,
  type HTMLAttributes,
  type ReactNode,
} from "react";

import { cn } from "./utils";

export type IconTileTone =
  | "default"
  | "commercial"
  | "schedule"
  | "people"
  | "green"
  | "violet"
  | "orange"
  | "danger";

export interface IconTileProps extends HTMLAttributes<HTMLSpanElement> {
  children: ReactNode;
  tone?: IconTileTone;
  label?: string;
}

export function IconTile({
  children,
  className,
  label,
  tone = "default",
  ...props
}: IconTileProps) {
  return (
    <span
      {...props}
      className={cn(
        "settings-column-icon",
        "ui-icon-tile",
        `ui-icon-tile--${tone}`,
        tone !== "default" && tone,
        className,
      )}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      {children}
    </span>
  );
}

export interface PanelActionsProps extends HTMLAttributes<HTMLSpanElement> {
  children: ReactNode;
}

export function PanelActions({ children, className, ...props }: PanelActionsProps) {
  return (
    <span {...props} className={cn("panel-heading-actions", "ui-panel-actions", className)}>
      {children}
    </span>
  );
}

export interface PanelHeaderProps extends Omit<HTMLAttributes<HTMLDivElement>, "title"> {
  title: ReactNode;
  subtitle?: ReactNode;
  icon?: ReactNode;
  iconTone?: IconTileTone;
  iconLabel?: string;
  actions?: ReactNode;
  titleId?: string;
  headingLevel?: 2 | 3 | 4 | 5 | 6;
}

export function PanelHeader({
  actions,
  className,
  headingLevel = 3,
  icon,
  iconLabel,
  iconTone,
  subtitle,
  title,
  titleId,
  ...props
}: PanelHeaderProps) {
  return (
    <div {...props} className={cn("settings-column-heading", "ui-panel-header", className)}>
      {icon && <IconTile tone={iconTone} label={iconLabel}>{icon}</IconTile>}
      <div className="ui-panel-header__copy">
        {createElement(`h${headingLevel}`, { id: titleId }, title)}
        {subtitle && <small>{subtitle}</small>}
      </div>
      {actions && <PanelActions>{actions}</PanelActions>}
    </div>
  );
}

export interface SectionHeaderProps extends Omit<HTMLAttributes<HTMLDivElement>, "title"> {
  title: ReactNode;
  description?: ReactNode;
  eyebrow?: ReactNode;
  actions?: ReactNode;
  titleId?: string;
  headingLevel?: 1 | 2 | 3;
}

export function SectionHeader({
  actions,
  className,
  description,
  eyebrow,
  headingLevel = 2,
  title,
  titleId,
  ...props
}: SectionHeaderProps) {
  return (
    <div {...props} className={cn("section-heading", "ui-section-header", className)}>
      <div className="section-title-block ui-section-header__copy">
        {eyebrow && <span className="eyebrow">{eyebrow}</span>}
        {createElement(`h${headingLevel}`, { id: titleId }, title)}
        {description && <p>{description}</p>}
      </div>
      {actions && <div className="ui-section-header__actions">{actions}</div>}
    </div>
  );
}
