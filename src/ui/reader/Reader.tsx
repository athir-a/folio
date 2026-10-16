import { useCallback, useEffect, useRef, useState } from 'react';
import { getBookFile, type Annotation } from '../../db/libraryDb';
import { openPdf, type OpenedPdf, type PdfDocument } from '../../pdf/pdf';
import { playPageTurn } from '../../lib/sfx';
import { HIGHLIGHT_COLOURS, useAnnotations, type Tool } from '../../state/annotationStore';
import { useLibrary } from '../../state/libraryStore';
import { useSettings } from '../../state/settingsStore';
import { CommentsPanel } from './CommentsPanel';
import { GesturePanel } from './GesturePanel';
import { Icon, type IconName } from './Icon';
import { MAX_ZOOM, MIN_ZOOM, PdfViewer, type ViewerHandle, type Zoom } from './PdfViewer';

/** PDF points are 1/72", screens are 96 px per inch: this is "100%". */
const ACTUAL_SIZE = 96 / 72;

const TOOLS: { id: Tool; icon: IconName; label: string }[] = [
  { id: 'select', icon: 'cursor', label: 'Select text' },
  { id: 'highlight', icon: 'highlighter', label: 'Highlight' },
  { id: 'note', icon: 'note', label: 'Sticky note' },
];

/** Full-screen reading view. Opens once a book has flown off the shelf. */
export function Reader() {
  const book = useLibrary((s) => (s.readerOpen ? s.books.find((b) => b.id === s.selectedId) : undefined));
  const closeBook = useLibrary((s) => s.closeBook);
  const removeBook = useLibrary((s) => s.removeBook);
  const setLastPage = useLibrary((s) => s.setLastPage);
  const gestures = useSettings((s) => s.gestures);
  const toggleGestures = useSettings((s) => s.toggleGestures);
  const { tool, colour, panelOpen, list } = useAnnotations();
  const { setTool, setColour, setPanelOpen, setActive } = useAnnotations.getState();
  const [doc, setDoc] = useState<PdfDocument | null>(null);
  const [error, setError] = useState(false);
  const [zoom, setZoom] = useState<Zoom>('fit');
  const [scale, setScale] = useState(1);
  const viewer = useRef<ViewerHandle>(null);
  const bookId = book?.id;
  const pageCount = doc?.numPages ?? book?.pageCount ?? 1;
  const page = Math.min(pageCount, Math.max(1, book?.lastPage ?? 1));
  // the page to open at, fixed when the book opens
  const [startPage, setStartPage] = useState(page);

  useEffect(() => {
    if (!bookId) return;
    let cancelled = false;
    let opened: OpenedPdf | null = null;
    setDoc(null);
    setError(false);
    setZoom('fit');
    setStartPage(useLibrary.getState().books.find((b) => b.id === bookId)?.lastPage ?? 1);
    void useAnnotations.getState().load(bookId);
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
      useAnnotations.getState().setTool('select');
    };
  }, [bookId]);

  /** Jumps to a page (buttons, keys, the page box and hand gestures all come through here). */
  const goTo = useCallback(
    (n: number) => {
      const next = Math.min(pageCount, Math.max(1, Math.round(n) || 1));
      if (next === page) return;
      viewer.current?.scrollToPage(next);
      if (!useSettings.getState().muted) playPageTurn();
    },
    [page, pageCount],
  );

  const onPageChange = useCallback((n: number) => bookId && setLastPage(bookId, n), [bookId, setLastPage]);
  const onJump = useCallback((a: Annotation) => viewer.current?.scrollToPage(a.page, a.y ?? a.rects?.[0]?.y ?? 0), []);

  const zoomBy = (factor: number) => setZoom(Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Math.round(scale * factor * 100) / 100)));

  useEffect(() => {
    if (!bookId) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === 'ArrowRight') goTo(page + 1);
      else if (e.key === 'ArrowLeft') goTo(page - 1);
      else if ((e.ctrlKey || e.metaKey) && (e.key === '=' || e.key === '+')) zoomBy(1.25);
      else if ((e.ctrlKey || e.metaKey) && e.key === '-') zoomBy(0.8);
      else if (e.key === 'Escape') {
        const s = useAnnotations.getState();
        if (s.activeId) s.setActive(null);
        else if (s.tool !== 'select') s.setTool('select');
        else closeBook();
      } else return;
      e.preventDefault();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  if (!book) return null;

  const onDelete = async () => {
    if (window.confirm(`Remove "${book.title}" from your shelf? This deletes the saved PDF and its notes.`)) {
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

      <div className="reader__toolbar" role="toolbar" aria-label="Reading tools">
        <div className="tool-group">
          {TOOLS.map((t) => (
            <button
              key={t.id}
              className={`icon-btn ${tool === t.id ? 'icon-btn--on' : ''}`}
              onClick={() => setTool(t.id)}
              aria-pressed={tool === t.id}
              title={t.label}
            >
              <Icon name={t.icon} />
              <span className="icon-btn__label">{t.label}</span>
            </button>
          ))}
          {tool === 'highlight' &&
            HIGHLIGHT_COLOURS.map((c) => (
              <button key={c} className={`swatch ${c === colour ? 'swatch--on' : ''}`} style={{ background: c }} onClick={() => setColour(c)} aria-label="Highlight colour" />
            ))}
        </div>

        <div className="tool-group">
          <button className="icon-btn" onClick={() => goTo(page - 1)} disabled={page <= 1} aria-label="Previous page" title="Previous page (←)">
            <Icon name="prev" />
          </button>
          <label className="page-box">
            <input
              key={page}
              type="number"
              min={1}
              max={pageCount}
              defaultValue={page}
              aria-label="Page number"
              onKeyDown={(e) => {
                if (e.key === 'Enter') goTo(Number(e.currentTarget.value));
              }}
              onBlur={(e) => goTo(Number(e.currentTarget.value))}
            />
            <span>/ {pageCount}</span>
          </label>
          <button className="icon-btn" onClick={() => goTo(page + 1)} disabled={page >= pageCount} aria-label="Next page" title="Next page (→)">
            <Icon name="next" />
          </button>
        </div>

        <div className="tool-group">
          <button className="icon-btn" onClick={() => zoomBy(0.8)} aria-label="Zoom out" title="Zoom out (Ctrl −)">
            <Icon name="minus" />
          </button>
          <span className="zoom-label">{Math.round((scale / ACTUAL_SIZE) * 100)}%</span>
          <button className="icon-btn" onClick={() => zoomBy(1.25)} aria-label="Zoom in" title="Zoom in (Ctrl +)">
            <Icon name="plus" />
          </button>
          <button className={`icon-btn ${zoom === 'fit' ? 'icon-btn--on' : ''}`} onClick={() => setZoom('fit')} title="Fit to width">
            <Icon name="fit" />
            <span className="icon-btn__label">Fit width</span>
          </button>
        </div>

        <div className="tool-group tool-group--end">
          <button className={`icon-btn ${gestures ? 'icon-btn--on' : ''}`} onClick={toggleGestures} aria-pressed={gestures} title="Turn pages by waving at your webcam">
            <Icon name="hand" />
            <span className="icon-btn__label">Gestures</span>
          </button>
          <button
            className={`icon-btn ${panelOpen ? 'icon-btn--on' : ''}`}
            onClick={() => {
              setPanelOpen(!panelOpen);
              if (panelOpen) setActive(null);
            }}
            aria-pressed={panelOpen}
            title="Comments"
          >
            <Icon name="comments" />
            <span className="icon-btn__label">Comments</span>
            {list.length > 0 && <span className="badge">{list.length}</span>}
          </button>
        </div>
      </div>
      <div className="reader__progress">
        <div style={{ width: `${(page / pageCount) * 100}%`, background: book.color }} />
      </div>

      <main className={`reader__body ${panelOpen ? 'reader__body--panel' : ''}`}>
        {error ? (
          <p className="reader__message">This book couldn't be opened.</p>
        ) : doc ? (
          <PdfViewer key={bookId} ref={viewer} doc={doc} zoom={zoom} initialPage={startPage} onPageChange={onPageChange} onScale={setScale} />
        ) : (
          <p className="reader__message">Opening…</p>
        )}
        {panelOpen && <CommentsPanel onJump={onJump} />}
        {gestures && <GesturePanel onNext={() => goTo(page + 1)} onPrev={() => goTo(page - 1)} />}
      </main>
    </div>
  );
}
