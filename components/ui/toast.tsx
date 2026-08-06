import { Check } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "./utils";

export interface ToastProps {
  message: ReactNode;
  icon?: ReactNode;
  className?: string;
}

export function Toast({ className, icon = <Check size={16} />, message }: ToastProps) {
  return (
    <div className={cn("toast", "ui-toast", className)} role="status" aria-live="polite">
      <span className="ui-toast__icon" aria-hidden="true">{icon}</span>
      <span>{message}</span>
    </div>
  );
}
