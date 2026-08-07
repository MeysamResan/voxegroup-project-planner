"use client";

import { RotateCcw, TriangleAlert } from "lucide-react";

import { Button, DialogActions, Modal } from "@/components/ui";

export interface ResetWorkspaceDialogProps {
  open: boolean;
  onClose: () => void;
  onReset: () => void;
}

export function ResetWorkspaceDialog({
  onClose,
  onReset,
  open,
}: ResetWorkspaceDialogProps) {
  if (!open) return null;

  return (
    <Modal
      title="Restore the preset?"
      subtitle="Reset this session to the original sample workspace."
      onClose={onClose}
    >
      <div className="reset-workspace">
        <div className="reset-workspace-message">
          <span aria-hidden="true"><TriangleAlert size={20} /></span>
          <div>
            <strong>All current edits and imported data will be discarded.</strong>
            <p>
              The built-in Customer Operations Platform preset will be restored.
              This cannot be undone.
            </p>
          </div>
        </div>
        <DialogActions>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button
            variant="danger"
            leadingIcon={<RotateCcw size={16} />}
            onClick={onReset}
          >
            Restore preset
          </Button>
        </DialogActions>
      </div>
    </Modal>
  );
}
