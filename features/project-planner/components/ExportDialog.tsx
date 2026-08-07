"use client";

import { EyeOff, FileDown, Info, Printer } from "lucide-react";

import { ActionCard, Modal } from "@/components/ui";

export interface ExportDialogProps {
  planningMode: boolean;
  onClose: () => void;
  onPrint: () => void;
  onDownload: () => void;
}

export function ExportDialog({
  onClose,
  onDownload,
  onPrint,
  planningMode,
}: ExportDialogProps) {
  return (
    <Modal
      title="Export project"
      subtitle="Choose how you want to share or save this project."
      onClose={onClose}
    >
      <div className="export-options">
        <ActionCard
          icon={<Printer size={21} />}
          title={planningMode ? "Print planning brief" : "Print client estimate"}
          description={
            planningMode
              ? "Prints the schedule, phases, effort and team with pricing omitted."
              : "Opens the clean client view and print dialog."
          }
          onClick={onPrint}
        />
        {!planningMode && (
          <ActionCard
            icon={<FileDown size={21} />}
            title="Download project JSON"
            description="Saves an editable backup you can import later."
            onClick={onDownload}
          />
        )}
        <p className="export-note">
          {planningMode ? <EyeOff size={15} /> : <Info size={15} />}
          {planningMode
            ? "Pricing stays excluded from this printout. Turn off Planning mode for the complete project backup."
            : "The JSON file includes internal pricing and people data."}
        </p>
      </div>
    </Modal>
  );
}
