"use client";
import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react";
import { AlertTriangle, X } from "@/components/icons";

interface ToastMsg {
  id: number;
  text: string;
  kind: "info" | "success";
}

const ToastContext = createContext<(text: string, kind?: "info" | "success") => void>(() => {});

export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastMsg | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const idRef = useRef(0);

  const showToast = useCallback((text: string, kind: "info" | "success" = "info") => {
    idRef.current += 1;
    setToast({ id: idRef.current, text, kind });
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setToast(null), 4500);
  }, []);

  return (
    <ToastContext.Provider value={showToast}>
      {children}
      {toast && (
        <div className={`toast ${toast.kind === "success" ? "success" : ""}`}>
          <AlertTriangle size={18} />
          <div>{toast.text}</div>
          <button type="button" onClick={() => setToast(null)} aria-label="Dismiss">
            <X size={16} />
          </button>
        </div>
      )}
    </ToastContext.Provider>
  );
}
