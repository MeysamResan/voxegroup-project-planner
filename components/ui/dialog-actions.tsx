import type { HTMLAttributes, ReactNode } from "react";

import { cn } from "./utils";

export interface DialogActionsProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  leading?: ReactNode;
}

export function DialogActions({
  children,
  className,
  leading,
  ...props
}: DialogActionsProps) {
  return (
    <div {...props} className={cn("modal-actions", "ui-dialog-actions", className)}>
      {leading}
      <span className="ui-dialog-actions__spacer" aria-hidden="true" />
      {children}
    </div>
  );
}
