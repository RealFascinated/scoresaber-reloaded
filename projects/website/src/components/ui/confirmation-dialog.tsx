"use client";

import { cloneElement, isValidElement, ReactElement, ReactNode, useState } from "react";
import { Button } from "./button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "./dialog";

interface ConfirmationDialogProps {
  trigger: ReactNode;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  variant?: "default" | "destructive";
  onConfirm: () => void | Promise<void>;
  onCancel?: () => void;
}

export function ConfirmationDialog({
  trigger,
  title,
  description,
  confirmText = "Confirm",
  cancelText = "Cancel",
  variant = "default",
  onConfirm,
  onCancel,
}: ConfirmationDialogProps) {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleConfirm = async () => {
    try {
      setIsLoading(true);
      await onConfirm();
      setOpen(false);
    } catch (error) {
      console.error("Confirmation action failed:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    onCancel?.();
    setOpen(false);
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setOpen(false);
    }
  };

  const handleTriggerClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setOpen(true);
  };

  const handleTriggerMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  const triggerElement = isValidElement(trigger) ? (
    cloneElement(
      trigger as ReactElement<{
        onClick?: (e: React.MouseEvent) => void;
        onMouseDown?: (e: React.MouseEvent) => void;
      }>,
      {
        onClick: handleTriggerClick,
        onMouseDown: handleTriggerMouseDown,
      }
    )
  ) : (
    <button
      type="button"
      onClick={handleTriggerClick}
      onMouseDown={handleTriggerMouseDown}
      className="inline-block text-left"
    >
      {trigger}
    </button>
  );

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {triggerElement}
      <DialogContent
        className="sm:max-w-md"
        onClick={e => e.stopPropagation()}
        onMouseDown={e => e.stopPropagation()}
      >
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleCancel} disabled={isLoading}>
            {cancelText}
          </Button>
          <Button
            variant={variant === "destructive" ? "destructive" : "default"}
            onClick={handleConfirm}
            disabled={isLoading}
          >
            {isLoading ? "Loading..." : confirmText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
