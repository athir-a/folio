import * as pdfjs from 'pdfjs-dist';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { COZY_PALETTE, cozify, rgbToHsl } from '../lib/color';
import { hashString } from '../lib/random';

pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

export type PdfDocument = pdfjs.PDFDocumentProxy;

export interface OpenedPdf {
  doc: PdfDocument;
  /** Frees the document and its worker resources. */
  close: () => Promise<void>;
}

export async function openPdf(data: ArrayBuffer): Promise<OpenedPdf> {
  const task = pdfjs.getDocument({ data });
  return { doc: await task.promise, close: () => task.destroy() };
}

export interface BookInfo {
  title: string;
  author?: string;
  pageCount: number;
  color: string;
  cover: Blob | null;
}

function titleFromFileName(name: string) {
  return name
    .replace(/\.pdf$/i, '')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Reads title/author/page count and renders page 1 as the cover image. */
export async function extractBookInfo(file: File): Promise<BookInfo> {
  const { doc, close } = await openPdf(await file.arrayBuffer());
  try {
    const meta = await doc.getMetadata().catch(() => null);
    const info = (meta?.info ?? {}) as Record<string, unknown>;
    const metaTitle = typeof info.Title === 'string' ? info.Title.trim() : '';
    // Many PDFs carry junk titles like "Microsoft Word - doc1.docx"; prefer the file name then.
    const usable = metaTitle.length > 1 && !/^(untitled|microsoft|document\d*|.*\.(docx?|pdf|tex))/i.test(metaTitle);
    const title = usable ? metaTitle : titleFromFileName(file.name) || 'Untitled';
    const author = typeof info.Author === 'string' && info.Author.trim() ? info.Author.trim() : undefined;

    let cover: Blob | null = null;
    let color = COZY_PALETTE[hashString(title) % COZY_PALETTE.length];
    try {
      const page = await doc.getPage(1);
      const base = page.getViewport({ scale: 1 });
      const viewport = page.getViewport({ scale: 512 / base.width });
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(viewport.width);
      canvas.height = Math.round(viewport.height);
      const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
      await page.render({ canvas, canvasContext: ctx, viewport }).promise;
      color = dominantColor(ctx, canvas.width, canvas.height) ?? color;
      cover = await new Promise<Blob | null>((res) => canvas.toBlob(res, 'image/jpeg', 0.85));
    } catch (err) {
      console.warn('Could not render cover', err);
    }

    return { title, author, pageCount: doc.numPages, color, cover };
  } finally {
    void close();
  }
}

/**
 * Finds the most common *colourful* hue on the cover. Text-only PDFs are
 * mostly white/black, so they fall back to the cozy palette instead.
 */
function dominantColor(ctx: CanvasRenderingContext2D, w: number, h: number): string | null {
  const { data } = ctx.getImageData(0, 0, w, h);
  const bins = new Array(24).fill(0);
  let colourful = 0;
  let total = 0;
  for (let i = 0; i < data.length; i += 4 * 7) {
    total++;
    const { h: hue, s, l } = rgbToHsl(data[i], data[i + 1], data[i + 2]);
    if (s > 0.3 && l > 0.15 && l < 0.85) {
      colourful++;
      bins[Math.floor(hue / 15) % 24]++;
    }
  }
  if (colourful / total < 0.04) return null;
  const best = bins.indexOf(Math.max(...bins));
  return cozify(best * 15 + 7.5);
}
