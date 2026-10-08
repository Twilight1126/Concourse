import { CheckCircle, PencilSimple, Trash, WarningCircle, X } from "@phosphor-icons/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { FeedbackContext } from "./action-feedback-context";
import "./ActionFeedback.css";

export function ActionFeedbackProvider({ children }) {
  const [confirmation, setConfirmation] = useState(null);
  const [toast, setToast] = useState(null);
  const [toastPaused, setToastPaused] = useState(false);
  const dialogRef = useRef(null);
  const resolveRef = useRef(null);

  const confirm = useCallback((options) => new Promise((resolve) => {
    resolveRef.current?.(false);
    resolveRef.current = resolve;
    setConfirmation(options);
  }), []);

  const finish = useCallback((accepted) => {
    resolveRef.current?.(accepted);
    resolveRef.current = null;
    setConfirmation(null);
    if (dialogRef.current?.open) dialogRef.current.close();
  }, []);

  const notify = useCallback((message, tone = "success") => {
    setToastPaused(false);
    setToast({ message, tone });
  }, []);

  useEffect(() => {
    if (confirmation && !dialogRef.current?.open) dialogRef.current?.showModal();
  }, [confirmation]);

  useEffect(() => {
    if (!toast || toast.tone === "error" || toastPaused) return undefined;
    const timeout = setTimeout(() => setToast(null), 6000);
    return () => clearTimeout(timeout);
  }, [toast, toastPaused]);

  const toastIcon = toast?.tone === "error" ? <WarningCircle size={21} weight="fill" />
    : toast?.tone === "updated" ? <PencilSimple size={21} weight="bold" />
      : toast?.tone === "deleted" ? <Trash size={21} weight="bold" />
        : <CheckCircle size={21} weight="fill" />;

  return <FeedbackContext.Provider value={{ confirm, notify }}>
    {children}
    <dialog ref={dialogRef} className="action-dialog" aria-labelledby="action-dialog-title" aria-describedby="action-dialog-message" onCancel={(event) => { event.preventDefault(); finish(false); }} onClose={() => finish(false)}>
      {confirmation && <>
        <div className="action-dialog__icon"><WarningCircle size={25} weight="duotone" aria-hidden="true" /></div>
        <h2 id="action-dialog-title">{confirmation.title}</h2>
        <p id="action-dialog-message">{confirmation.message}</p>
        <div className="action-dialog__actions">
          <button type="button" autoFocus onClick={() => finish(false)}>Cancel</button>
          <button className="is-danger" type="button" onClick={() => finish(true)}>{confirmation.confirmLabel || "Delete"}</button>
        </div>
      </>}
    </dialog>
    <div className="sr-only" role="status">{toast?.tone !== "error" ? toast?.message : null}</div>
    <div className="sr-only" role="alert">{toast?.tone === "error" ? toast.message : null}</div>
    {toast && <div className={`action-toast is-${toast.tone}`}
      onMouseEnter={() => setToastPaused(true)}
      onMouseLeave={(event) => { if (!event.currentTarget.contains(document.activeElement)) setToastPaused(false); }}
      onFocusCapture={() => setToastPaused(true)}
      onBlurCapture={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setToastPaused(false); }}>
      <span className="action-toast__icon" aria-hidden="true">{toastIcon}</span>
      <strong>{toast.message}</strong>
      <button type="button" onClick={() => setToast(null)} aria-label="Dismiss notification"><X size={17} /></button>
    </div>}
  </FeedbackContext.Provider>;
}
