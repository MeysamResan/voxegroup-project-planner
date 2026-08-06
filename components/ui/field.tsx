import {
  useId,
  type HTMLAttributes,
  type ReactNode,
} from "react";

import { cn } from "./utils";

export interface FieldProps extends Omit<HTMLAttributes<HTMLDivElement>, "children"> {
  label: ReactNode;
  children: ReactNode;
  htmlFor?: string;
  description?: ReactNode;
  error?: ReactNode;
  optional?: boolean;
  descriptionId?: string;
  errorId?: string;
  trailingAction?: ReactNode;
}

export function Field({
  children,
  className,
  description,
  descriptionId,
  error,
  errorId,
  htmlFor,
  label,
  optional = false,
  trailingAction,
  ...props
}: FieldProps) {
  const generatedId = useId();
  const resolvedDescriptionId = description
    ? descriptionId ?? `${generatedId}-description`
    : undefined;
  const resolvedErrorId = error ? errorId ?? `${generatedId}-error` : undefined;

  return (
    <div
      {...props}
      className={cn("field", "ui-field", Boolean(error) && "ui-field--invalid", className)}
      data-description-id={resolvedDescriptionId}
      data-error-id={resolvedErrorId}
    >
      <span className="ui-field__heading">
        {htmlFor ? (
          <label className="ui-field__label" htmlFor={htmlFor}>{label}</label>
        ) : (
          <span className="ui-field__label">{label}</span>
        )}
        {optional && <span className="ui-field__optional">Optional</span>}
      </span>
      <div className={cn(
        "ui-field__control",
        Boolean(trailingAction) && "ui-field__control--with-action",
      )}>
        {children}
        {trailingAction}
      </div>
      {description && <small className="ui-field__description" id={resolvedDescriptionId}>{description}</small>}
      {error && <small className="ui-field__error" id={resolvedErrorId} role="alert">{error}</small>}
    </div>
  );
}
