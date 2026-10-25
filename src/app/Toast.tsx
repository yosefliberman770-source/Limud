import { useStore } from './store';

export function Toast() {
  const toast = useStore((s) => s.toast);
  const dismiss = useStore((s) => s.dismissToast);
  if (!toast) return null;
  return (
    <div className="toast" role="status" aria-live="polite">
      <span>{toast.text}</span>
      <div className="row">
        {toast.undo && <button onClick={() => { toast.undo?.(); dismiss(); }}>ביטול</button>}
        <button onClick={dismiss} aria-label="סגור">✕</button>
      </div>
    </div>
  );
}
