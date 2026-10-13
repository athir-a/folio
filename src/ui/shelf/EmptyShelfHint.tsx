import { useLibrary } from '../../state/libraryStore';

export function EmptyShelfHint() {
  const show = useLibrary((s) => s.loaded && s.books.length === 0 && s.busy === 0);
  if (!show) return null;
  return (
    <div className="empty-hint">
      <strong>An empty shelf, ready for stories</strong>
      <span>Add a PDF, or drop one anywhere, and it will be bound and shelved here</span>
    </div>
  );
}
