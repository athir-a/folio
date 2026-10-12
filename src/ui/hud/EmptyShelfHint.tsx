import { useLibrary } from '../../state/libraryStore';

export function EmptyShelfHint() {
  const show = useLibrary((s) => s.loaded && s.books.length === 0 && s.busy === 0);
  if (!show) return null;
  return (
    <div className="empty-hint">
      <strong>Your shelf is empty</strong>
      <span>Add a PDF, or drop one anywhere, to shelve your first book</span>
    </div>
  );
}
