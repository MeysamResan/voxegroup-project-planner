"use client";

import {
  forwardRef,
  type InputHTMLAttributes,
  type TextareaHTMLAttributes,
} from "react";

import { cn, type UiControlSize } from "./utils";

export interface TextInputProps extends InputHTMLAttributes<HTMLInputElement> {
  controlSize?: UiControlSize;
}

export const TextInput = forwardRef<HTMLInputElement, TextInputProps>(
  function TextInput(
    {
      className,
      controlSize = "md",
      type = "text",
      ...props
    },
    ref,
  ) {
    return (
      <input
        {...props}
        ref={ref}
        type={type}
        className={cn("ui-text-input", `ui-control--${controlSize}`, className)}
      />
    );
  },
);

export interface TextAreaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  controlSize?: UiControlSize;
}

export const TextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>(
  function TextArea(
    {
      className,
      controlSize = "md",
      ...props
    },
    ref,
  ) {
    return (
      <textarea
        {...props}
        ref={ref}
        className={cn("ui-text-area", `ui-control--${controlSize}`, className)}
      />
    );
  },
);
