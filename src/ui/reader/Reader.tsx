import { useCallback, useEffect, useRef, useState } from 'react';
import { getBookFile } from '../../db/libraryDb';
import { openPdf, type OpenedPdf, type PdfDocument } from '../../pdf/pdf';
import { playPageTurn } from '../../lib/sfx';
import { useLibrary } from '../../state/libraryStore';
import { useSettings } from '../../state/settingsStore';
import { PdfPage } from './PdfPage';

/** Full-screen reading view. Opens once a book has flown off the shelf. */
export function Reader() {
  const book = useLibrary((s) => (s.readerOpen ? s.books.find((b) => b.id === s.selectedId) : undefined));
  const closeBook = useLibrary((s) => s.closeBook);
  const removeBook = useLibrary((s) => s.removeBook);
  const setLastPage = useLibrary((s) => s.setLastPage);
  const [doc, setDoc] = useState<PdfDocument | null>(null);
  const [error, setError] = useState(false);
  const bookId = book?.id;
  const pageCount = doc?.numPages ?? book?.pageCount ?? 1;
  // The store owns the current page, so anything (buttons, keys, future gestures)
  // can turn pages by calling setLastPage.
  const page = Math.min(pageCount, Math.max(1, book?.lastPage ?? 1));

  // Remember which way we last turned, for the page-turn animation.
  const turn = useRef<{ page: number; direction: 'next' | 'prev' }>({ page, direction: 'next' });
  if (turn.current.page !== page) turn.current = { page, direction: page > turn.current.page ? 'next' : 'prev' };

  useEffect(() => {
    if (!bookId) return;
    let cancelled = false;
    let opened: OpenedPdf | null = null;
    setDoc(null);
    setError(false);
    (async () => {
      const blob = await getBookFile(bookId);
      if (!blob) throw new Error('missing file');
      opened = await openPdf(await blob.arrayBuffer());
      if (cancelled) void opened.close();
      else setDoc(opened.doc);
    })().catch((err) => {
      console.error(err);
      if (!cancelled) setError(true);
    });
    return () => {
      cancelled = true;
      void opened?.close();
    };
  }, [bookId]);

  const goTo = useCallback(
    (n: number) => {
      if (!bookId) return;
      const next = Math.min(pageCount, Math.max(1, Math.round(n) || 1));
      if (next === page) return;
      setLastPage(bookId, next);
      if (!useSettings.getState().muted) playPageTurn();
    },
    [bookId, page, pageCount, setLastPage],
  );

  useEffect(() => {
    if (!bookId) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;
      if (e.key === 'ArrowRight' || e.key === 'PageDown' || e.key === ' ') goTo(page + 1);
      else if (e.key === 'ArrowLeft' || e.key === 'PageUp') goTo(page - 1);
      else if (e.key === 'Escape') closeBook();
      else return;
      e.preventDefault();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [bookId, page, goTo, closeBook]);

  if (!book) return null;

  const onDelete = async () => {
    if (window.confirm(`Remove "${book.title}" from your shelf? This deletes the saved PDF.`)) {
      await removeBook(book.id);
    }
  };

  return (
    <div className="reader" role="dialog" aria-modal="true" aria-label={book.title}>
      <header className="reader__header">
        <span className="reader__spine" style={{ background: book.color }} />
        <div className="reader__title">
          <h2>{book.title}</h2>
          {book.author && <span>{book.author}</span>}
        </div>
        <button className="reader__action reader__action--danger" onClick={onDelete} title="Remove from shelf">
          Remove
        </button>
        <button className="reader__action" onClick={closeBook} title="Back to the shelf (Esc)">
          Back to shelf
        </button>
      </header>

      <main className="reader__stage">
        <button className="reader__turn reader__turn--prev" onClick={() => goTo(page - 1)} disabled={page <= 1} aria-label="Previous page">
          ‹
        </button>
        {error ? (
          <p className="reader__message">This book couldn't be opened.</p>
        ) : doc ? (
          <PdfPage key={page} doc={doc} pageNumber={page} direction={turn.current.direction} />
        ) : (
          <p className="reader__message">Opening…</p>
        )}
        <button className="reader__turn reader__turn--next" onClick={() => goTo(page + 1)} disabled={page >= pageCount} aria-label="Next page">
          ›
        </button>
      </main>

      <footer className="reader__footer">
        <div className="reader__progress">
          <div style={{ width: `${(page / pageCount) * 100}%`, background: book.color }} />
        </div>
        <label className="reader__page">
          Page
          <input
            key={page}
            type="number"
            min={1}
            max={pageCount}
            defaultValue={page}
            onKeyDown={(e) => {
              if (e.key === 'Enter') goTo(Number(e.currentTarget.value));
            }}
            onBlur={(e) => goTo(Number(e.currentTarget.value))}
          />
          of {pageCount}
        </label>
      </footer>
    </div>
  );
}
