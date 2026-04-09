import { useEffect, useRef, useState } from "react";

interface ToastProps {
  message: string | null;
  type?: "error" | "warning" | "success";
  onDismiss: () => void;
  duration?: number;
}

export function Toast({ message, type = "error", onDismiss, duration = 6000 }: ToastProps) {
  const [visible, setVisible] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const dismiss = () => {
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
    setVisible(false);
    setTimeout(onDismiss, 280);
  };

  useEffect(() => {
    if (message) {
      setVisible(true);
      timerRef.current = setTimeout(dismiss, duration);
      return () => { if (timerRef.current) clearTimeout(timerRef.current); };
    } else {
      setVisible(false);
    }
  }, [message, duration]);

  if (!message) return null;

  const icons: Record<string, string> = { error: "✖", warning: "⚠", success: "✔" };
  const icon = icons[type] ?? "ℹ";

  return (
    <div
      className={`toast toast-${type} ${visible ? "toast-visible" : "toast-hidden"}`}
      role="alert"
      onClick={dismiss}
    >
      <span className="toast-icon">{icon}</span>
      <span className="toast-message">{message}</span>
      <button className="toast-close" aria-label="Dismiss" type="button" onClick={(e) => { e.stopPropagation(); dismiss(); }}>✕</button>
    </div>
  );
}
