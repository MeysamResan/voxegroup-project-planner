"use client";

import {
  useId,
  type ReactNode,
  type TextareaHTMLAttributes,
} from "react";
import { MessageSquareText, Sparkles } from "lucide-react";

import { IconButton } from "./icon-button";
import { MoneyInput, type MoneyInputProps } from "./money-input";
import { TextArea } from "./text-input";
import { cn, type UiControlSize } from "./utils";

export interface AiNoteButtonProps {
  hasNotes: boolean;
  open: boolean;
  onToggle: () => void;
  subject: string;
  controls: string;
  className?: string;
  disabled?: boolean;
  size?: UiControlSize;
}

export function AiNoteButton({
  className,
  controls,
  disabled = false,
  hasNotes,
  onToggle,
  open,
  size = "md",
  subject,
}: AiNoteButtonProps) {
  const action = hasNotes ? "Edit" : "Add";
  return (
    <IconButton
      className={cn("note-button", hasNotes && "has-notes", className)}
      label={`${action} AI notes for ${subject}`}
      title="Notes for AI"
      aria-expanded={open}
      aria-controls={controls}
      disabled={disabled}
      size={size}
      onClick={onToggle}
    >
      <MessageSquareText size={16} aria-hidden="true" />
    </IconButton>
  );
}

export interface AiNoteEditorProps
  extends Omit<
    TextareaHTMLAttributes<HTMLTextAreaElement>,
    "children" | "id" | "onChange" | "value"
  > {
  id: string;
  value: string;
  onChange: (value: string) => void;
  label?: ReactNode;
  helpText?: ReactNode;
  className?: string;
}

export function AiNoteEditor({
  autoFocus = true,
  className,
  helpText = "Saved with this project so future AI analysis can understand the reasoning.",
  id,
  label = "Notes for future AI",
  onChange,
  rows = 3,
  value,
  ...textareaProps
}: AiNoteEditorProps) {
  const helpId = `${id}-help`;
  const inputId = `${id}-input`;
  return (
    <div className={cn("row-notes-editor", "ui-ai-note-editor", className)} id={id}>
      <label htmlFor={inputId}>
        <Sparkles size={14} aria-hidden="true" />
        {label}
      </label>
      <TextArea
        {...textareaProps}
        id={inputId}
        autoFocus={autoFocus}
        rows={rows}
        value={value}
        aria-describedby={textareaProps["aria-describedby"] ?? (helpText ? helpId : undefined)}
        onChange={(event) => onChange(event.target.value)}
      />
      {helpText && <small id={helpId}>{helpText}</small>}
    </div>
  );
}

export interface NotedNumberFieldProps
  extends Omit<MoneyInputProps, "fieldClassName"> {
  notes: string;
  onNotesChange: (value: string) => void;
  notesOpen: boolean;
  onNotesToggle: () => void;
  noteSubject?: string;
  notePlaceholder?: string;
  noteHelpText?: ReactNode;
  noteLabel?: ReactNode;
  notesId?: string;
  className?: string;
  editorClassName?: string;
}

export function NotedNumberField({
  className,
  editorClassName,
  label,
  noteHelpText,
  noteLabel,
  notePlaceholder,
  noteSubject,
  notes,
  notesId,
  notesOpen,
  onNotesChange,
  onNotesToggle,
  size = "md",
  ...numberProps
}: NotedNumberFieldProps) {
  const generatedId = useId();
  const editorId = notesId ?? `noted-number-${generatedId.replace(/:/g, "")}`;
  return (
    <div className={cn(
      "ui-noted-number-field",
      `ui-control--${size}`,
      className,
    )}>
      <MoneyInput
        {...numberProps}
        label={label}
        size={size}
        trailingAction={(
          <AiNoteButton
            hasNotes={Boolean(notes.trim())}
            open={notesOpen}
            onToggle={onNotesToggle}
            subject={noteSubject ?? label}
            controls={editorId}
            size={size}
          />
        )}
      />
      {notesOpen && (
        <AiNoteEditor
          id={editorId}
          value={notes}
          onChange={onNotesChange}
          label={noteLabel}
          helpText={noteHelpText}
          placeholder={notePlaceholder}
          className={cn(
            "ui-noted-number-field__editor",
            editorClassName,
          )}
        />
      )}
    </div>
  );
}
