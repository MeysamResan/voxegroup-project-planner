"use client";

import { useRef, type ChangeEvent } from "react";
import {
  ArrowDownToLine,
  Eye,
  EyeOff,
  Moon,
  RotateCcw,
  Sun,
  Upload,
} from "lucide-react";

import {
  Button,
  IconButton,
  SegmentedControl,
  TextInput,
  type SegmentedControlOption,
} from "@/components/ui";
import type { ViewMode } from "@/lib/pricing/types.ts";
import type { ColorTheme } from "../hooks/useColorTheme";

type PricingVisibilityMode = "planning" | "pricing";

const PRICING_VISIBILITY_OPTIONS: ReadonlyArray<
  SegmentedControlOption<PricingVisibilityMode>
> = [
  { value: "pricing", label: "Pricing", ariaLabel: "Pricing mode" },
  { value: "planning", label: "Planning", ariaLabel: "Planning mode" },
];

const VIEW_OPTIONS: ReadonlyArray<SegmentedControlOption<ViewMode>> = [
  { value: "internal", label: "Internal" },
  { value: "client", label: "Client" },
];

export interface TopbarProps {
  projectName: string;
  planningMode: boolean;
  theme: ColorTheme;
  usingSystemTheme: boolean;
  view: ViewMode;
  onProjectNameChange: (projectName: string) => void;
  onPlanningModeChange: (planningMode: boolean) => void;
  onThemeToggle: () => void;
  onViewChange: (view: ViewMode) => void;
  onReset: () => void;
  onImport: (file: File) => void | Promise<void>;
  onExport: () => void;
}

export function Topbar({
  projectName,
  planningMode,
  theme,
  usingSystemTheme,
  view,
  onProjectNameChange,
  onPlanningModeChange,
  onThemeToggle,
  onViewChange,
  onReset,
  onImport,
  onExport,
}: TopbarProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImportChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";
    if (file) void onImport(file);
  };

  const handlePricingVisibilityChange = (mode: PricingVisibilityMode) => {
    const nextPlanningMode = mode === "planning";
    if (nextPlanningMode !== planningMode) onPlanningModeChange(nextPlanningMode);
  };

  return (
    <header className="topbar glass-panel">
      <div className="nav-brand" aria-label="Voxe Group">
        <div className="brand-mark" aria-hidden="true">V</div>
        <div className="brand-wordmark">
          <strong>VOXE</strong>
          <span>GROUP</span>
        </div>
      </div>

      <label className="project-identity">
        <TextInput
          aria-label="Project name"
          title={projectName}
          value={projectName}
          onChange={(event) => onProjectNameChange(event.target.value)}
        />
      </label>

      <div className="topbar-actions">
        <div className="mode-controls">
          <SegmentedControl
            size="md"
            className="topbar-planning-switch"
            value={planningMode ? "planning" : "pricing"}
            options={PRICING_VISIBILITY_OPTIONS}
            onChange={handlePricingVisibilityChange}
            ariaLabel="Pricing visibility"
          />
          <Button
            size="md"
            variant="secondary"
            className="topbar-planning-toggle"
            aria-label="Planning mode"
            aria-pressed={planningMode}
            title={planningMode ? "Show pricing" : "Hide pricing"}
            leadingIcon={planningMode ? <EyeOff size={16} /> : <Eye size={16} />}
            onClick={() => onPlanningModeChange(!planningMode)}
          >
            {planningMode ? "Planning" : "Pricing"}
          </Button>
          <SegmentedControl
            size="md"
            className="topbar-view-toggle"
            value={view}
            options={VIEW_OPTIONS}
            onChange={onViewChange}
            ariaLabel="Interface view"
          />
          <IconButton
            size="md"
            variant="ghost"
            className="topbar-theme-toggle"
            data-theme={theme}
            label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
            title={`Switch to ${theme === "dark" ? "light" : "dark"} mode${
              usingSystemTheme ? " (currently following your device)" : ""
            }`}
            onClick={onThemeToggle}
          >
            <span className="theme-toggle-icons" aria-hidden="true">
              <Sun className="theme-toggle-icon theme-toggle-sun" size={17} />
              <Moon className="theme-toggle-icon theme-toggle-moon" size={17} />
            </span>
          </IconButton>
        </div>

        <span className="nav-divider" aria-hidden="true" />

        <div className="file-actions">
          <Button
            size="md"
            variant="ghost"
            className="topbar-reset"
            aria-label="Reset all data"
            title="Reset all data"
            leadingIcon={<RotateCcw size={16} />}
            onClick={onReset}
          >
            Reset
          </Button>
          <Button
            size="md"
            variant="ghost"
            className="topbar-import"
            aria-label="Import project"
            title="Import project"
            leadingIcon={<Upload size={16} />}
            onClick={() => fileInputRef.current?.click()}
          >
            Import
          </Button>
          <Button
            size="md"
            variant="secondary"
            className="topbar-export"
            aria-label="Export project"
            title="Export project"
            leadingIcon={<ArrowDownToLine size={16} />}
            onClick={onExport}
          >
            Export
          </Button>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="application/json,.json"
          hidden
          onChange={handleImportChange}
        />
      </div>
    </header>
  );
}
