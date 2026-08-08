"use client";

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown } from "lucide-react";

import { cn, type UiControlSize } from "./utils";

export interface GlassOption<Value extends string = string> {
  value: Value;
  label: ReactNode;
  disabled?: boolean;
}

export interface GlassSelectProps<Value extends string = string> {
  value: Value;
  options: ReadonlyArray<GlassOption<Value>>;
  onChange: (value: Value) => void;
  ariaLabel: string;
  className?: string;
  disabled?: boolean;
  placeholder?: ReactNode;
  size?: UiControlSize;
}

export function GlassSelect<Value extends string = string>({
  ariaLabel,
  className,
  disabled = false,
  onChange,
  options,
  placeholder = "Select an option",
  size = "md",
  value,
}: GlassSelectProps<Value>) {
  const [open, setOpen] = useState(false);
  const [menuStyle, setMenuStyle] = useState<CSSProperties>({});
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const positionFrameRef = useRef<number | null>(null);
  const menuId = useId();
  const selected = options.find((option) => option.value === value);

  const positionMenu = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) return;
    const rect = trigger.getBoundingClientRect();
    const gap = 8;
    const viewportPadding = 12;
    const availableBelow = window.innerHeight - rect.bottom - viewportPadding;
    const maxHeight = Math.min(320, Math.max(160, window.innerHeight - viewportPadding * 2));
    const menuWidth = Math.max(rect.width, 190);
    const openAbove = availableBelow < 180 && rect.top > availableBelow;
    const nextStyle: CSSProperties = {
      left: Math.max(
        viewportPadding,
        Math.min(rect.left, window.innerWidth - menuWidth - viewportPadding),
      ),
      top: openAbove
        ? Math.max(viewportPadding, rect.top - Math.min(maxHeight, options.length * 48 + 16) - gap)
        : rect.bottom + gap,
      width: menuWidth,
      maxHeight,
    };
    setMenuStyle((currentStyle) => (
      currentStyle.left === nextStyle.left
      && currentStyle.top === nextStyle.top
      && currentStyle.width === nextStyle.width
      && currentStyle.maxHeight === nextStyle.maxHeight
        ? currentStyle
        : nextStyle
    ));
  }, [options.length]);

  const cancelPositionFrame = useCallback(() => {
    if (positionFrameRef.current === null) return;
    window.cancelAnimationFrame(positionFrameRef.current);
    positionFrameRef.current = null;
  }, []);

  const scheduleMenuPosition = useCallback(() => {
    if (positionFrameRef.current !== null) return;
    positionFrameRef.current = window.requestAnimationFrame(() => {
      positionFrameRef.current = null;
      positionMenu();
    });
  }, [positionMenu]);

  const closeMenu = useCallback(() => {
    cancelPositionFrame();
    setOpen(false);
  }, [cancelPositionFrame]);

  const openMenu = useCallback(() => {
    if (disabled || options.length === 0) return;
    cancelPositionFrame();
    positionMenu();
    setOpen(true);
  }, [cancelPositionFrame, disabled, options.length, positionMenu]);

  useEffect(() => {
    if (!open) return;
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!triggerRef.current?.contains(target) && !menuRef.current?.contains(target)) closeMenu();
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeMenu();
        triggerRef.current?.focus();
      }
    };
    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    window.addEventListener("resize", scheduleMenuPosition);
    window.addEventListener("scroll", scheduleMenuPosition, true);
    const focusFrame = window.requestAnimationFrame(() => {
      const selectedOption = menuRef.current?.querySelector<HTMLElement>(
        '[role="option"][aria-selected="true"]:not(:disabled)',
      );
      const firstOption = menuRef.current?.querySelector<HTMLElement>(
        '[role="option"]:not(:disabled)',
      );
      (selectedOption ?? firstOption)?.focus();
    });
    return () => {
      cancelPositionFrame();
      window.cancelAnimationFrame(focusFrame);
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("resize", scheduleMenuPosition);
      window.removeEventListener("scroll", scheduleMenuPosition, true);
    };
  }, [cancelPositionFrame, closeMenu, open, scheduleMenuPosition]);

  const choose = (option: GlassOption<Value>) => {
    if (option.disabled) return;
    onChange(option.value);
    closeMenu();
    triggerRef.current?.focus();
  };

  const moveOptionFocus = (
    event: ReactKeyboardEvent<HTMLButtonElement>,
  ) => {
    const items = Array.from(
      menuRef.current?.querySelectorAll<HTMLButtonElement>(
        ".glass-select-option:not(:disabled)",
      ) ?? [],
    );
    if (!items.length) return;
    const index = items.indexOf(event.currentTarget);
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      const next = event.key === "ArrowDown"
        ? (index + 1) % items.length
        : (index - 1 + items.length) % items.length;
      items[next]?.focus();
    } else if (event.key === "Home" || event.key === "End") {
      event.preventDefault();
      items[event.key === "Home" ? 0 : items.length - 1]?.focus();
    } else if (event.key.length === 1 && /\S/.test(event.key)) {
      const query = event.key.toLocaleLowerCase();
      const ordered = [...items.slice(index + 1), ...items.slice(0, index + 1)];
      ordered.find((item) => item.textContent?.trim().toLocaleLowerCase().startsWith(query))?.focus();
    }
  };

  const menu = open && typeof document !== "undefined"
    ? createPortal(
        <div
          id={menuId}
          ref={menuRef}
          className="glass-select-menu ui-select__menu"
          role="listbox"
          aria-label={ariaLabel}
          style={menuStyle}
          onBlur={() => window.requestAnimationFrame(() => {
            const active = document.activeElement;
            if (!menuRef.current?.contains(active) && active !== triggerRef.current) closeMenu();
          })}
        >
          {options.map((option) => (
            <button
              type="button"
              role="option"
              aria-selected={option.value === value}
              className="glass-select-option ui-select__option"
              disabled={option.disabled}
              key={option.value}
              onClick={() => choose(option)}
              onKeyDown={moveOptionFocus}
            >
              <span>{option.label}</span>
              {option.value === value && <Check size={16} aria-hidden="true" />}
            </button>
          ))}
        </div>,
        document.body,
      )
    : null;

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className={cn(
          "glass-select-trigger",
          "ui-select__trigger",
          `ui-control--${size}`,
          className,
        )}
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-controls={menuId}
        aria-expanded={open}
        disabled={disabled}
        onClick={() => open ? closeMenu() : openMenu()}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault();
            openMenu();
          }
        }}
      >
        <span className={selected ? undefined : "placeholder"}>{selected?.label ?? placeholder}</span>
        <ChevronDown size={16} className={open ? "rotated" : ""} aria-hidden="true" />
      </button>
      {menu}
    </>
  );
}
