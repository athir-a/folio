import { useRef } from 'react';
import { useLibrary } from '../../state/libraryStore';

export function AddBookButton() {
  const input = useRef<HTMLInputElement>(null);
  const busy = useLibrary((s) => s.busy > 0);
  const addFiles = useLibrary((s) => s.addFiles);

  return (
    <div className="add-book">
      <button className="add-book__button" onClick={() => input.current?.click()} disabled={busy}>
        {busy ? (
          <>
            <span className="spinner" aria-hidden="true" /> Binding your book…
          </>
        ) : (
          <>
            <span className="add-book__plus" aria-hidden="true">+</span> Add a book
          </>
        )}
      </button>
      <input
        ref={input}
        type="file"
        accept="application/pdf,.pdf"
        multiple
        hidden
        onChange={(e) => {
          if (e.target.files?.length) void addFiles(e.target.files);
          e.target.value = '';
        }}
      />
    </div>
  );
}
