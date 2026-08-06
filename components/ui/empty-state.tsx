import {
  type HTMLAttributes,
  type ReactNode,
} from "react";

import { cn } from "./utils";

export interface EmptyStateProps extends Omit<HTMLAttributes<HTMLDivElement>, "title"> {
  title: ReactNode;
  description?: ReactNode;
  icon?: ReactNode;
  action?: ReactNode;
  compact?: boolean;
}

export function EmptyState({
  action,
  className,
  compact = false,
  description,
  icon,
  title,
  ...props
}: EmptyStateProps) {
  return (
    <div
      {...props}
      className={cn("empty-state", "ui-empty-state", compact && "ui-empty-state--compact", className)}
    >
      {icon && <span className="ui-empty-state__icon" aria-hidden="true">{icon}</span>}
      <strong>{title}</strong>
      {description && <span>{description}</span>}
      {action && <div className="ui-empty-state__action">{action}</div>}
    </div>
  );
}
