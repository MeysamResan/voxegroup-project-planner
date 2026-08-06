"use client";

import { Eye } from "lucide-react";

import { Button, DialogActions, Modal } from "@/components/ui";

export interface RevealPricingDialogProps {
  open: boolean;
  onClose: () => void;
  onReveal: () => void;
}

export function RevealPricingDialog({
  onClose,
  onReveal,
  open,
}: RevealPricingDialogProps) {
  if (!open) return null;

  return (
    <Modal
      title="Reveal pricing?"
      subtitle="Use this only when the private pricing discussion is ready."
      onClose={onClose}
    >
      <div className="reveal-pricing">
        <div className="reveal-pricing-message">
          <span aria-hidden="true"><Eye size={20} /></span>
          <div>
            <strong>Commercial details will become visible everywhere.</strong>
            <p>
              This includes rates, costs, expenses, margins, quotes and internal
              financial notes.
            </p>
          </div>
        </div>
        <DialogActions>
          <Button variant="secondary" onClick={onClose}>Keep hidden</Button>
          <Button variant="primary" leadingIcon={<Eye size={16} />} onClick={onReveal}>
            Reveal pricing
          </Button>
        </DialogActions>
      </div>
    </Modal>
  );
}
