"use client";

import { useId, type FormEvent } from "react";
import { Check, Trash2 } from "lucide-react";

import {
  Button,
  ColorPicker,
  DialogActions,
  Field,
  GlassSelect,
  Modal,
  MoneyInput,
  TextArea,
  TextInput,
  type ColorOption,
  type GlassOption,
} from "@/components/ui";
import { COLORS, PERSON_TYPES } from "@/lib/pricing/constants.ts";
import { initials } from "@/lib/pricing/formatters.ts";
import type { Currency, Person, PersonType } from "@/lib/pricing/types.ts";

const COLOR_NAMES = ["Violet", "Pink", "Teal", "Orange", "Blue", "Gold"] as const;

const COLOR_OPTIONS: ReadonlyArray<ColorOption<string>> = COLORS.map((value, index) => ({
  value,
  label: COLOR_NAMES[index] ?? `Profile color ${index + 1}`,
}));

const PERSON_TYPE_OPTIONS: ReadonlyArray<GlassOption<PersonType>> = PERSON_TYPES.map((type) => ({
  value: type,
  label: type,
}));

export interface PersonEditorDialogProps {
  person: Person | null;
  isNew: boolean;
  planningMode: boolean;
  currency: Currency;
  onChange: (person: Person) => void;
  onClose: () => void;
  onSave: (person: Person) => void;
  onDelete: (personId: string) => void;
}

export function PersonEditorDialog({
  currency,
  isNew,
  onChange,
  onClose,
  onDelete,
  onSave,
  person,
  planningMode,
}: PersonEditorDialogProps) {
  const formId = useId();

  if (!person) return null;

  const inputId = (name: string) => `${formId}-${name}`;
  const updatePerson = <Key extends keyof Person>(key: Key, value: Person[Key]) => {
    onChange({ ...person, [key]: value });
  };
  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!person.name.trim() || !person.role.trim()) return;
    onSave(person);
  };

  return (
    <Modal
      title={isNew ? "Add someone" : "Edit profile"}
      subtitle={
        planningMode
          ? "Planning details are editable; commercial fields stay hidden."
          : "Personal and professional details stay on this device."
      }
      onClose={onClose}
      wide
    >
      <form onSubmit={handleSubmit}>
        <div className="person-editor-top">
          <div
            className="editor-avatar"
            style={{ background: person.color }}
            aria-hidden="true"
          >
            {initials(person.name)}
          </div>
          <ColorPicker
            label="Profile color"
            value={person.color}
            options={COLOR_OPTIONS}
            onChange={(color) => updatePerson("color", color)}
          />
        </div>

        <div className="form-grid">
          <Field label="Full name *" htmlFor={inputId("name")}>
            <TextInput
              id={inputId("name")}
              required
              autoComplete="name"
              value={person.name}
              onChange={(event) => updatePerson("name", event.target.value)}
            />
          </Field>

          <Field label="Relationship">
            <GlassSelect
              ariaLabel="Relationship"
              value={person.type}
              options={PERSON_TYPE_OPTIONS}
              onChange={(type) => updatePerson("type", type)}
            />
          </Field>

          <Field label="Role *" htmlFor={inputId("role")}>
            <TextInput
              id={inputId("role")}
              required
              autoComplete="organization-title"
              value={person.role}
              onChange={(event) => updatePerson("role", event.target.value)}
            />
          </Field>

          <Field label="Department" htmlFor={inputId("department")}>
            <TextInput
              id={inputId("department")}
              value={person.department}
              onChange={(event) => updatePerson("department", event.target.value)}
            />
          </Field>

          {!planningMode && (
            <MoneyInput
              id={inputId("hourly-cost")}
              label="Internal hourly cost"
              value={person.hourlyCost}
              onChange={(hourlyCost) => updatePerson("hourlyCost", hourlyCost)}
              suffix={`${currency}/h`}
              min={0}
            />
          )}

          <Field label="Email" htmlFor={inputId("email")}>
            <TextInput
              id={inputId("email")}
              type="email"
              autoComplete="email"
              value={person.email}
              onChange={(event) => updatePerson("email", event.target.value)}
            />
          </Field>

          <Field label="Phone" htmlFor={inputId("phone")}>
            <TextInput
              id={inputId("phone")}
              type="tel"
              autoComplete="tel"
              value={person.phone}
              onChange={(event) => updatePerson("phone", event.target.value)}
            />
          </Field>

          <Field label="Location" htmlFor={inputId("location")}>
            <TextInput
              id={inputId("location")}
              autoComplete="street-address"
              value={person.location}
              onChange={(event) => updatePerson("location", event.target.value)}
            />
          </Field>

          <Field label="Skills" htmlFor={inputId("skills")}>
            <TextInput
              id={inputId("skills")}
              placeholder="Comma-separated"
              value={person.skills}
              onChange={(event) => updatePerson("skills", event.target.value)}
            />
          </Field>

          {!planningMode && (
            <Field className="full" label="Internal notes" htmlFor={inputId("notes")}>
              <TextArea
                id={inputId("notes")}
                rows={3}
                value={person.notes}
                onChange={(event) => updatePerson("notes", event.target.value)}
              />
            </Field>
          )}
        </div>

        <DialogActions
          leading={!isNew ? (
            <Button
              variant="danger"
              leadingIcon={<Trash2 size={15} />}
              onClick={() => onDelete(person.id)}
            >
              Remove person
            </Button>
          ) : undefined}
        >
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="primary" leadingIcon={<Check size={16} />}>
            {isNew ? "Add to people" : "Save profile"}
          </Button>
        </DialogActions>
      </form>
    </Modal>
  );
}
