import { memo, useEffect, useRef } from 'react';
import { TextLayer } from 'pdfjs-dist';
import type { Annotation } from '../../db/libraryDb';
import type { PdfDocument } from '../../pdf/pdf';
import { useAnnotations } from '../../state/annotationStore';
import { Icon } from './Icon';

/** Keeps very zoomed-in pages from allocating enormous canvases. */
const MAX_CANVAS_PIXELS = 16_000_000;

interface Props {
  doc: PdfDocument;
  pageNumber: number;
  /** Size in CSS pixels at the current zoom. */
  width: number;
  height: number;
  scale: number;
  /** Only pages near the screen are drawn; the rest are blank paper. */
  active: boolean;
  annotations: Annotation[];
  activeId: string | null;
}

/**
 * One page of the book: the rendered PDF, a transparent text layer on top so
 * text can be selected, the reader's highlights underneath the text, and
 * sticky-note pins above it.
 */
export const PageView = memo(function PageView({ doc, pageNumber, width, height, scale, active, annotations, activeId }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const textRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!active) return;
    let cancelled = false;
    let task: { cancel: () => void } | null = null;
    let text: TextLayer | null = null;
    (async () => {
      const page = await doc.getPage(pageNumber);
      if (cancelled) return;
      const viewport = page.getViewport({ scale });
      const area = viewport.width * viewport.height;
      const dpr = Math.min(window.devicePixelRatio || 1, 2.5, Math.sqrt(MAX_CANVAS_PIXELS / area));
      const canvas = canvasRef.current!;
      const hi = page.getViewport({ scale: scale * dpr });
      canvas.width = Math.floor(hi.width);
      canvas.height = Math.floor(hi.height);
      const render = page.render({ canvas, canvasContext: canvas.getContext('2d')!, viewport: hi });
      task = render;
      // the text layer, for selecting and highlighting
      const container = textRef.current!;
      container.replaceChildren();
      text = new TextLayer({ textContentSource: page.streamTextContent(), container, viewport });
      await Promise.all([render.promise, text.render()]);
    })().catch((err) => {
      if (err?.name !== 'RenderingCancelledException' && err?.name !== 'AbortException') console.error(err);
    });
    return () => {
      cancelled = true;
      task?.cancel();
      text?.cancel();
    };
  }, [doc, pageNumber, scale, active]);

  return (
    <div
      className="pdf-page"
      data-page={pageNumber}
      style={{ width, height, ['--total-scale-factor' as string]: scale, ['--scale-round-x' as string]: '1px', ['--scale-round-y' as string]: '1px' }}
    >
      {active && <canvas ref={canvasRef} className="pdf-page__canvas" />}
      <div className="pdf-page__highlights">
        {annotations.map((a) =>
          a.kind === 'highlight'
            ? a.rects?.map((r, i) => (
                <div
                  key={`${a.id}-${i}`}
                  className={`pdf-highlight ${a.id === activeId ? 'pdf-highlight--active' : ''}`}
                  style={{ left: `${r.x * 100}%`, top: `${r.y * 100}%`, width: `${r.w * 100}%`, height: `${r.h * 100}%`, background: a.color }}
                />
              ))
            : null,
        )}
      </div>
      {active && <div ref={textRef} className="textLayer" />}
      {annotations.map((a) => (a.kind === 'note' ? <NotePin key={a.id} note={a} open={a.id === activeId} /> : null))}
    </div>
  );
});

/** A sticky note on the page; opens into a little editor when selected. */
function NotePin({ note, open }: { note: Annotation; open: boolean }) {
  const { setActive, update, remove, setPanelOpen } = useAnnotations.getState();
  return (
    <div className="note-pin" style={{ left: `${(note.x ?? 0) * 100}%`, top: `${(note.y ?? 0) * 100}%` }}>
      <button
        className="note-pin__icon"
        style={{ background: note.color }}
        onClick={(e) => {
          e.stopPropagation();
          setActive(open ? null : note.id);
        }}
        aria-label="Sticky note"
        title={note.comment || 'Sticky note'}
      >
        <Icon name="note" size={16} />
      </button>
      {open && (
        <div className="note-popup" onClick={(e) => e.stopPropagation()} onPointerUp={(e) => e.stopPropagation()}>
          <textarea
            autoFocus
            value={note.comment}
            placeholder="Write a note…"
            onChange={(e) => update(note.id, { comment: e.target.value })}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                e.stopPropagation();
                setActive(null);
              }
            }}
          />
          <div className="note-popup__actions">
            <button onClick={() => setPanelOpen(true)}>All comments</button>
            <button className="note-popup__delete" onClick={() => remove(note.id)} aria-label="Delete note">
              <Icon name="trash" size={15} />
            </button>
            <button onClick={() => setActive(null)}>Done</button>
          </div>
        </div>
      )}
    </div>
  );
}
