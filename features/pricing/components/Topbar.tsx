"use client";

import { useRef, type ChangeEvent } from "react";
import {
  ArrowDownToLine,
  BriefcaseBusiness,
  Eye,
  EyeOff,
  Upload,
} from "lucide-react";

import {
  Button,
  SegmentedControl,
  Switch,
  TextInput,
  type SegmentedControlOption,
} from "@/components/ui";
import type { ViewMode } from "@/lib/pricing/types.ts";

const VIEW_OPTIONS: ReadonlyArray<SegmentedControlOption<ViewMode>> = [
  { value: "internal", label: "Internal" },
  { value: "client", label: "Client" },
];

export interface TopbarProps {
  projectName: string;
  planningMode: boolean;
  view: ViewMode;
  onProjectNameChange: (projectName: string) => void;
  onTogglePlanningMode: () => void;
  onViewChange: (view: ViewMode) => void;
  onImport: (file: File) => void | Promise<void>;
  onExport: () => void;
}

export function Topbar({
  projectName,
  planningMode,
  view,
  onProjectNameChange,
  onTogglePlanningMode,
  onViewChange,
  onImport,
  onExport,
}: TopbarProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImportChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";
    if (file) void onImport(file);
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
        <span className="project-identity-icon">
          <BriefcaseBusiness size={17} />
        </span>
        <span className="project-identity-copy">
          <small>Current project</small>
          <TextInput
            aria-label="Project name"
            value={projectName}
            onChange={(event) => onProjectNameChange(event.target.value)}
          />
        </span>
      </label>

      <div className="topbar-actions">
        <div className="mode-controls">
          <Switch
            size="lg"
            checked={planningMode}
            onCheckedChange={onTogglePlanningMode}
            label="Planning mode"
            ariaLabel={
              planningMode
                ? "Turn off planning mode and show pricing"
                : "Turn on planning mode and hide pricing"
            }
            title={planningMode ? "Show pricing" : "Hide pricing"}
            checkedDescription="Pricing hidden"
            uncheckedDescription="Pricing visible"
            checkedIcon={<EyeOff size={15} />}
            uncheckedIcon={<Eye size={15} />}
          />
          <SegmentedControl
            size="lg"
            value={view}
            options={VIEW_OPTIONS}
            onChange={onViewChange}
            ariaLabel="Interface view"
          />
        </div>

        <span className="nav-divider" aria-hidden="true" />

        <div className="file-actions">
          <Button
            size="lg"
            variant="secondary"
            className="topbar-import"
            aria-label="Import project"
            title="Import project"
            leadingIcon={<Upload size={16} />}
            onClick={() => fileInputRef.current?.click()}
          >
            Import
          </Button>
          <Button
            size="lg"
            variant="primary"
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
