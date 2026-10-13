import { useEffect } from 'react';
import { useLibrary } from '../../state/libraryStore';

/** A small engraved card announcing what just happened, in the style of a library notice. */
export function Toast() {
  const toast = useLibrary((s) => s.toast);
  const dismiss = useLibrary((s) => s.dismissToast);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(dismiss, toast.kind === 'new-book' ? 3600 : 2800);
    return () => clearTimeout(timer);
  }, [toast, dismiss]);

  if (!toast) return null;
  return (
    <div key={toast.key} className={`toast toast--${toast.kind}`} role="status" onClick={dismiss}>
      {toast.kind === 'new-book' && (
        <div className="toast__cover">
          {toast.coverUrl ? <img src={toast.coverUrl} alt="" /> : <span aria-hidden="true">✦</span>}
        </div>
      )}
      <div className="toast__text">
        {toast.kind === 'new-book' && <span className="toast__eyebrow">A new book joins your shelf</span>}
        <strong>{toast.title}</strong>
        {toast.subtitle && <span>{toast.subtitle}</span>}
      </div>
    </div>
  );
}
