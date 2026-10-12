import { useEffect, useRef, useState } from 'react';
import type { PdfDocument } from '../../pdf/pdf';

/** Renders one PDF page, sized to fit its container, crisp on high-DPI screens. */
export function PdfPage({ doc, pageNumber, direction }: { doc: PdfDocument; pageNumber: number; direction: 'next' | 'prev' }) {
  const wrapper = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });

  useEffect(() => {
    const el = wrapper.current!;
    const observer = new ResizeObserver(([entry]) => {
      setSize({ w: entry.contentRect.width, h: entry.contentRect.height });
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!size.w || !size.h) return;
    let cancelled = false;
    let task: ReturnType<Awaited<ReturnType<PdfDocument['getPage']>>['render']> | null = null;
    (async () => {
      const page = await doc.getPage(pageNumber);
      if (cancelled) return;
      const base = page.getViewport({ scale: 1 });
      const fit = Math.min(size.w / base.width, size.h / base.height);
      const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
      const viewport = page.getViewport({ scale: fit * dpr });
      const c = canvas.current!;
      c.width = Math.floor(viewport.width);
      c.height = Math.floor(viewport.height);
      c.style.width = `${Math.floor(viewport.width / dpr)}px`;
      c.style.height = `${Math.floor(viewport.height / dpr)}px`;
      task = page.render({ canvas: c, canvasContext: c.getContext('2d')!, viewport });
      await task.promise;
    })().catch((err) => {
      if (err?.name !== 'RenderingCancelledException') console.error(err);
    });
    return () => {
      cancelled = true;
      task?.cancel();
    };
  }, [doc, pageNumber, size.w, size.h]);

  return (
    <div ref={wrapper} className="pdf-page">
      <canvas ref={canvas} className={`pdf-page__canvas pdf-page__canvas--${direction}`} />
    </div>
  );
}
