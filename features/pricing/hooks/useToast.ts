"use client";

import { useCallback, useEffect, useState } from "react";

export interface ToastController {
  message: string;
  showToast: (message: string) => void;
  clearToast: () => void;
}

export function useToast(duration = 2800): ToastController {
  const [message, setMessage] = useState("");

  const showToast = useCallback((nextMessage: string) => {
    setMessage(nextMessage);
  }, []);
  const clearToast = useCallback(() => setMessage(""), []);

  useEffect(() => {
    if (!message) return;
    const timer = window.setTimeout(clearToast, duration);
    return () => window.clearTimeout(timer);
  }, [clearToast, duration, message]);

  return { message, showToast, clearToast };
}
