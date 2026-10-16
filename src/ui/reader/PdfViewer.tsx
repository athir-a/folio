import { useCallback, useEffect, useImperativeHandle, useLayoutEffect, useMemo, useRef, useState, type Ref } from 'react';
import type { PageRect } from '../../db/libraryDb';
import type { PdfDocument } from '../../pdf/pdf';
import { HIGHLIGHT_COLOURS, useAnnotations } from '../../state/annotationStore';
import { Icon } from './Icon';
import { PageView } from './PageView';

const GAP = 16;
const PAD = 20;
export const MIN_ZOOM = 0.25;
export const MAX_ZOOM = 5;

export type Zoom = 'fit' | number;

export interface ViewerHandle {
  /** Scrolls so that `page` is at the top, or `y` (0..1 down the page) is a little below the top. */
  scrollToPage: (page: number, y?: number) => void;
}

interface Props {
  doc: PdfDocument;
  zoom: Zoom;
  initialPage: number;
  onPageChange: (page: number) => void;
  /** Reports the scale actually in use, so the toolbar can show it. */
  onScale: (scale: number) => void;
  ref?: Ref<ViewerHandle>;
}

interface Selected {
  page: number;
  rects: PageRect[];
  quote: string;
  /** Where to show the little menu, in viewport pixels. */
  x: number;
  y: number;
}

/**
 * Continuous, scrolling PDF view in the style of desktop readers: pages are
 * stacked top to bottom, fitted to the width by default, and only the pages
 * near the screen are actually drawn.
 */
export function PdfViewer({ doc, zoom, initialPage, onPageChange, onScale, ref }: Props) {
  const scroller = useRef<HTMLDivElement>(null);
  const [sizes, setSizes] = useState<{ w: number; h: number }[] | null>(null);
  const [viewW, setViewW] = useState(0);
  const [range, setRange] = useState<[number, number]>([1, 2]);
  const [selected, setSelected] = useState<Selected | null>(null);
  const list = useAnnotations((s) => s.list);
  const activeId = useAnnotations((s) => s.activeId);
  const tool = useAnnotations((s) => s.tool);
  const current = useRef(initialPage);
  const pendingScroll = useRef<{ page: number; y: number } | null>({ page: initialPage, y: 0 });

  // every page's size at 100%, so the whole book can be laid out before drawing
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const out: { w: number; h: number }[] = [];
      for (let i = 1; i <= doc.numPages; i++) {
        const vp = (await doc.getPage(i)).getViewport({ scale: 1 });
        out.push({ w: vp.width, h: vp.height });
      }
      if (!cancelled) setSizes(out);
    })().catch(console.error);
    return () => {
      cancelled = true;
    };
  }, [doc]);

  useEffect(() => {
    const el = scroller.current!;
    const observer = new ResizeObserver(([entry]) => setViewW(entry.contentRect.width));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const widest = useMemo(() => (sizes ? Math.max(...sizes.map((s) => s.w)) : 1), [sizes]);
  const scale = zoom === 'fit' ? Math.max(MIN_ZOOM, (viewW - PAD * 2) / widest) : zoom;
  useEffect(() => onScale(scale), [scale, onScale]);

  // where each page starts, top to bottom
  const tops = useMemo(() => {
    if (!sizes) return [];
    const out: number[] = [];
    let y = PAD;
    for (const s of sizes) {
      out.push(y);
      y += Math.floor(s.h * scale) + GAP;
    }
    return out;
  }, [sizes, scale]);

  const pageAt = useCallback(
    (y: number) => {
      let lo = 0;
      let hi = tops.length - 1;
      while (lo < hi) {
        const mid = (lo + hi + 1) >> 1;
        if (tops[mid] <= y) lo = mid;
        else hi = mid - 1;
      }
      return lo + 1;
    },
    [tops],
  );

  const scrollToPage = useCallback(
    (page: number, y = 0) => {
      const el = scroller.current;
      if (!el || !sizes) {
        pendingScroll.current = { page, y };
        return;
      }
      const p = Math.min(sizes.length, Math.max(1, page));
      const offset = y > 0 ? y * sizes[p - 1].h * scale - el.clientHeight * 0.25 : -8;
      el.scrollTop = Math.max(0, tops[p - 1] + offset);
    },
    [sizes, scale, tops],
  );
  useImperativeHandle(ref, () => ({ scrollToPage }), [scrollToPage]);

  // work out the current page and which pages to draw
  const onScroll = useCallback(() => {
    const el = scroller.current;
    if (!el || !tops.length) return;
    const first = pageAt(el.scrollTop - el.clientHeight);
    const last = pageAt(el.scrollTop + el.clientHeight * 2);
    setRange((r) => (r[0] === first && r[1] === last ? r : [first, last]));
    const page = pageAt(el.scrollTop + el.clientHeight * 0.4);
    if (page !== current.current) {
      current.current = page;
      onPageChange(page);
    }
  }, [tops, pageAt, onPageChange]);

  // keep the same spot in view when the zoom or window size changes
  const anchor = useRef<{ page: number; frac: number } | null>(null);
  useLayoutEffect(() => {
    const el = scroller.current;
    if (!el || !sizes || !tops.length || !viewW) return;
    if (pendingScroll.current) {
      const { page, y } = pendingScroll.current;
      pendingScroll.current = null;
      scrollToPage(page, y);
    } else if (anchor.current) {
      const { page, frac } = anchor.current;
      el.scrollTop = tops[page - 1] + frac * sizes[page - 1].h * scale;
    }
    onScroll();
  }, [tops, viewW]); // eslint-disable-line react-hooks/exhaustive-deps

  const rememberAnchor = () => {
    const el = scroller.current;
    if (!el || !sizes || !tops.length) return;
    const page = pageAt(el.scrollTop);
    anchor.current = { page, frac: (el.scrollTop - tops[page - 1]) / (sizes[page - 1].h * scale) };
  };

  /** After a mouse-up, turn any text selection into highlight rectangles. */
  const readSelection = () => {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || !sel.rangeCount) return null;
    const range = sel.getRangeAt(0);
    const node = range.commonAncestorContainer;
    const pageEl = (node instanceof Element ? node : node.parentElement)?.closest('.pdf-page');
    if (!(pageEl instanceof HTMLElement)) return null;
    const box = pageEl.getBoundingClientRect();
    const rects: PageRect[] = [];
    for (const r of Array.from(range.getClientRects())) {
      if (r.width < 2 || r.height < 2) continue;
      const rect = {
        x: (r.left - box.left) / box.width,
        y: (r.top - box.top) / box.height,
        w: r.width / box.width,
        h: r.height / box.height,
      };
      // drop rects that duplicate one already covering the same line
      if (!rects.some((o) => Math.abs(o.y - rect.y) < 0.004 && rect.x >= o.x - 0.002 && rect.x + rect.w <= o.x + o.w + 0.002)) rects.push(rect);
    }
    const quote = sel.toString().replace(/\s+/g, ' ').trim();
    if (!rects.length || !quote) return null;
    const last = range.getBoundingClientRect();
    return { page: Number(pageEl.dataset.page), rects, quote, x: last.left + last.width / 2, y: last.bottom };
  };

  const addHighlight = (s: Selected, colour: string, comment = false) => {
    const { add, setActive, setPanelOpen } = useAnnotations.getState();
    const a = add({ kind: 'highlight', page: s.page, rects: s.rects, quote: s.quote, color: colour, comment: '' });
    window.getSelection()?.removeAllRanges();
    setSelected(null);
    if (a && comment) {
      setActive(a.id);
      setPanelOpen(true);
    }
  };

  const onPointerUp = (e: React.PointerEvent) => {
    const state = useAnnotations.getState();
    // note pins and their editors handle their own clicks
    if ((e.target as Element).closest('.note-pin')) return;
    const pageEl = (e.target as Element).closest('.pdf-page');
    if (!(pageEl instanceof HTMLElement)) return;
    const page = Number(pageEl.dataset.page);
    const box = pageEl.getBoundingClientRect();
    const x = (e.clientX - box.left) / box.width;
    const y = (e.clientY - box.top) / box.height;

    if (state.tool === 'note') {
      const a = state.add({ kind: 'note', page, x, y, color: '#ffd84a', comment: '' });
      if (a) state.setActive(a.id);
      state.setTool('select');
      return;
    }
    // let the browser finish updating the selection first
    setTimeout(() => {
      const s = readSelection();
      if (s) {
        if (useAnnotations.getState().tool === 'highlight') addHighlight(s, useAnnotations.getState().colour);
        else setSelected(s);
        return;
      }
      setSelected(null);
      // a plain click on a highlight selects it
      const hit = useAnnotations
        .getState()
        .list.find((a) => a.page === page && a.kind === 'highlight' && a.rects?.some((r) => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h));
      state.setActive(hit ? hit.id : null);
      if (hit) state.setPanelOpen(true);
    });
  };

  const byPage = useMemo(() => {
    const m = new Map<number, typeof list>();
    for (const a of list) m.set(a.page, [...(m.get(a.page) ?? []), a]);
    return m;
  }, [list]);

  return (
    <div
      ref={scroller}
      className={`pdf-viewer pdf-viewer--${tool}`}
      onScroll={() => {
        onScroll();
        rememberAnchor();
        if (selected) setSelected(null);
      }}
      onPointerUp={onPointerUp}
    >
      {!sizes || !viewW ? (
        <p className="reader__message">Opening…</p>
      ) : (
        <div className="pdf-viewer__pages" style={{ padding: `${PAD}px`, gap: `${GAP}px` }}>
          {sizes.map((s, i) => {
            const n = i + 1;
            return (
              <PageView
                key={n}
                doc={doc}
                pageNumber={n}
                width={Math.floor(s.w * scale)}
                height={Math.floor(s.h * scale)}
                scale={scale}
                active={n >= range[0] && n <= range[1]}
                annotations={byPage.get(n) ?? EMPTY}
                activeId={activeId}
              />
            );
          })}
        </div>
      )}
      {selected && (
        <div className="selection-menu" style={{ left: selected.x, top: selected.y + 8 }} onPointerUp={(e) => e.stopPropagation()}>
          {HIGHLIGHT_COLOURS.map((c) => (
            <button key={c} className="selection-menu__swatch" style={{ background: c }} onClick={() => addHighlight(selected, c)} aria-label="Highlight" title="Highlight" />
          ))}
          <button onClick={() => addHighlight(selected, useAnnotations.getState().colour, true)} title="Highlight and comment">
            <Icon name="comments" size={16} /> Comment
          </button>
          <button
            onClick={() => {
              void navigator.clipboard?.writeText(selected.quote);
              setSelected(null);
            }}
            title="Copy text"
          >
            <Icon name="copy" size={16} />
          </button>
        </div>
      )}
    </div>
  );
}

const EMPTY: never[] = [];
