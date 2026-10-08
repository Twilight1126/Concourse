import { useEffect, useState } from "react";

function readDraft(key, fallback) {
  try {
    const saved = window.sessionStorage.getItem(key);
    return saved ? { ...fallback, ...JSON.parse(saved) } : fallback;
  } catch {
    return fallback;
  }
}

export function clearSessionDraft(key) {
  try { window.sessionStorage.removeItem(key); } catch { /* Storage may be unavailable. */ }
}

export function useSessionDraft(key, initialValues) {
  const [values, setValues] = useState(() => readDraft(key, initialValues));
  const [changed, setChanged] = useState(false);

  useEffect(() => {
    if (!changed) return;
    try { window.sessionStorage.setItem(key, JSON.stringify(values)); } catch { /* Keep the form usable. */ }
  }, [changed, key, values]);

  function updateValues(nextValues) {
    setChanged(true);
    setValues(nextValues);
  }

  function clearDraft() {
    setChanged(false);
    clearSessionDraft(key);
  }

  return [values, updateValues, clearDraft, setValues];
}
