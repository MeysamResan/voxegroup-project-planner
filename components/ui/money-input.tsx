"use client";

import { useId, type ReactNode } from "react";

import { Field } from "./field";
import { NumberStepper, type NumberStepperProps } from "./number-stepper";

export interface MoneyInputProps
  extends Omit<NumberStepperProps, "ariaLabel" | "id" | "suffix"> {
  label: string;
  suffix?: ReactNode;
  description?: ReactNode;
  error?: ReactNode;
  id?: string;
  fieldClassName?: string;
  trailingAction?: ReactNode;
}

export function MoneyInput({
  description,
  error,
  fieldClassName,
  id,
  label,
  suffix,
  trailingAction,
  ...stepperProps
}: MoneyInputProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const descriptionId = description ? `${inputId}-description` : undefined;
  const errorId = error ? `${inputId}-error` : undefined;
  const describedBy = [
    stepperProps["aria-describedby"],
    descriptionId,
    errorId,
  ].filter(Boolean).join(" ") || undefined;

  return (
    <Field
      className={fieldClassName}
      label={label}
      htmlFor={inputId}
      description={description}
      error={error}
      descriptionId={descriptionId}
      errorId={errorId}
      trailingAction={trailingAction}
    >
      <NumberStepper
        {...stepperProps}
        id={inputId}
        ariaLabel={label}
        suffix={suffix}
        aria-invalid={Boolean(error) || undefined}
        aria-describedby={describedBy}
      />
    </Field>
  );
}
