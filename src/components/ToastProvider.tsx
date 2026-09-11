"use client";
import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react";
import { AlertTriangle, X } from "@/components/icons";

interface ToastMsg {
  id: number;
  text: string;
  kind: "info" | "success" | "warning" | "error";
}

const ToastContext = createContext<(text: string, kind?: ToastMsg["kind"]) => void>(() => {});

function readableMessage(message: string) {
  const text = message.replace(/^error:\s*/i, "").trim();
  const lower = text.toLowerCase();

  if (lower.includes("duplicate key") || lower.includes("already registered")) {
    return "This value is already in use. Please choose another one.";
  }
  if (lower.includes("not found")) return "The requested record could not be found.";
  if (lower.includes("insufficient stock")) return text.replace(/insufficient stock\.?/i, "Not enough stock.");
  if (lower.includes("quantity must be greater than zero")) return "Quantity must be greater than zero.";
  if (lower.includes("discount cannot be more than")) return "Discount cannot be more than the bill subtotal.";
  if (lower.includes("grand total cannot be negative")) return "The bill total cannot be negative.";
  if (lower.includes("account details not found")) return "The username, email, or phone number did not match.";
  if (lower.includes("invalid password")) return "Please enter a valid password.";
  if (lower.includes("failed to fetch") || lower.includes("network")) return "Could not connect to the server. Please try again.";
  return text;
}

export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastMsg | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const idRef = useRef(0);

  const showToast = useCallback((text: string, kind: ToastMsg["kind"] = "info") => {
    idRef.current += 1;
    setToast({ id: idRef.current, text: readableMessage(text), kind });
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setToast(null), 4500);
  }, []);

  return (
    <ToastContext.Provider value={showToast}>
      {children}
      {toast && (
        <div className={`toast toast-${toast.kind}`}>
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
