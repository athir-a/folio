import { create } from 'zustand';
import * as db from '../db/libraryDb';
import type { BookRecord } from '../db/libraryDb';
import { extractBookInfo } from '../pdf/pdf';
import { playChime, playPop } from '../lib/sfx';

/**
 * Central library state. UI, the 3D scene and (later) gesture input all call
 * these actions, so new input methods only need to call e.g. `openBook`.
 */

export interface Burst {
  id: number;
  position: [number, number, number];
  color: string;
}

export interface Toast {
  key: number;
  kind: 'new-book' | 'info' | 'error';
  title: string;
  subtitle?: string;
  coverUrl?: string;
}

interface LibraryState {
  books: BookRecord[];
  coverUrls: Record<string, string>;
  loaded: boolean;
  /** Books currently playing their "arrive on shelf" animation. */
  entering: Record<string, true>;
  busy: number;
  selectedId: string | null;
  readerOpen: boolean;
  bursts: Burst[];
  shakeAt: number;
  toast: Toast | null;
  muted: boolean;

  init: () => Promise<void>;
  addFiles: (files: FileList | File[]) => Promise<void>;
  removeBook: (id: string) => Promise<void>;
  openBook: (id: string) => void;
  closeBook: () => void;
  setLastPage: (id: string, page: number) => void;
  land: (id: string, position: [number, number, number], color: string) => void;
  finishEnter: (id: string) => void;
  removeBurst: (id: number) => void;
  showToast: (toast: Omit<Toast, 'key'>) => void;
  dismissToast: () => void;
  toggleMute: () => void;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
let initPromise: Promise<void> | null = null;
let burstId = 0;
let toastKey = 0;
const pageWrites = new Map<string, ReturnType<typeof setTimeout>>();

function readMuted() {
  try {
    return localStorage.getItem('cozy-library:muted') === '1';
  } catch {
    return false;
  }
}

export const useLibrary = create<LibraryState>((set, get) => ({
  books: [],
  coverUrls: {},
  loaded: false,
  entering: {},
  busy: 0,
  selectedId: null,
  readerOpen: false,
  bursts: [],
  shakeAt: -Infinity,
  toast: null,
  muted: readMuted(),

  init() {
    initPromise ??= (async () => {
      const books = await db.getAllBooks();
      const coverUrls: Record<string, string> = {};
      await Promise.all(
        books.map(async (b) => {
          const blob = await db.getCover(b.id);
          if (blob) coverUrls[b.id] = URL.createObjectURL(blob);
        }),
      );
      set({ books, coverUrls, loaded: true });
    })();
    return initPromise;
  },

  async addFiles(files) {
    const pdfs = Array.from(files).filter((f) => f.type === 'application/pdf' || /\.pdf$/i.test(f.name));
    if (pdfs.length === 0) {
      get().showToast({ kind: 'error', title: 'Only PDFs fit on this shelf', subtitle: 'Try a .pdf file' });
      return;
    }
    await get().init();

    for (const [i, file] of pdfs.entries()) {
      if (get().books.some((b) => b.fileName === file.name && b.fileSize === file.size)) {
        get().showToast({ kind: 'info', title: 'Already on your shelf', subtitle: file.name });
        continue;
      }
      set((s) => ({ busy: s.busy + 1 }));
      try {
        const info = await extractBookInfo(file);
        const record: BookRecord = {
          id: crypto.randomUUID(),
          title: info.title,
          author: info.author,
          fileName: file.name,
          fileSize: file.size,
          pageCount: info.pageCount,
          color: info.color,
          addedAt: Date.now(),
          lastPage: 1,
        };
        await db.addBook(record, file, info.cover);
        const coverUrl = info.cover ? URL.createObjectURL(info.cover) : undefined;
        set((s) => ({
          books: [...s.books, record],
          coverUrls: coverUrl ? { ...s.coverUrls, [record.id]: coverUrl } : s.coverUrls,
          entering: { ...s.entering, [record.id]: true },
        }));
        if (!get().muted) playPop();
      } catch (err) {
        console.error(err);
        get().showToast({ kind: 'error', title: 'Could not read that PDF', subtitle: file.name });
      } finally {
        set((s) => ({ busy: s.busy - 1 }));
      }
      // Let each book finish its entrance before the next one pops in.
      if (i < pdfs.length - 1) await sleep(1400);
    }
  },

  async removeBook(id) {
    await db.deleteBook(id);
    const url = get().coverUrls[id];
    if (url) URL.revokeObjectURL(url);
    set((s) => {
      const coverUrls = { ...s.coverUrls };
      delete coverUrls[id];
      return {
        books: s.books.filter((b) => b.id !== id),
        coverUrls,
        selectedId: s.selectedId === id ? null : s.selectedId,
        readerOpen: s.selectedId === id ? false : s.readerOpen,
      };
    });
  },

  openBook(id) {
    if (get().entering[id] || get().selectedId) return;
    set({ selectedId: id });
    // Let the book fly towards the camera before the pages open.
    setTimeout(() => {
      if (get().selectedId === id) set({ readerOpen: true });
    }, 650);
  },

  closeBook() {
    set({ readerOpen: false });
    setTimeout(() => set({ selectedId: null }), 120);
  },

  setLastPage(id, page) {
    set((s) => ({
      books: s.books.map((b) => (b.id === id ? { ...b, lastPage: page, lastReadAt: Date.now() } : b)),
    }));
    clearTimeout(pageWrites.get(id));
    pageWrites.set(
      id,
      setTimeout(() => void db.updateBook(id, { lastPage: page, lastReadAt: Date.now() }), 400),
    );
  },

  land(id, position, color) {
    const s = get();
    const index = s.books.findIndex((b) => b.id === id);
    if (!s.muted) playChime();
    set({
      bursts: [...s.bursts, { id: ++burstId, position, color }],
      shakeAt: performance.now(),
    });
    if (index >= 0) {
      s.showToast({
        kind: 'new-book',
        title: s.books[index].title,
        subtitle: index === 0 ? 'Your very first book!' : `Book #${index + 1} shelved`,
        coverUrl: s.coverUrls[id],
      });
    }
  },

  finishEnter(id) {
    set((s) => {
      const entering = { ...s.entering };
      delete entering[id];
      return { entering };
    });
  },

  removeBurst(id) {
    set((s) => ({ bursts: s.bursts.filter((b) => b.id !== id) }));
  },

  showToast(toast) {
    set({ toast: { ...toast, key: ++toastKey } });
  },

  dismissToast() {
    set({ toast: null });
  },

  toggleMute() {
    const muted = !get().muted;
    try {
      localStorage.setItem('cozy-library:muted', muted ? '1' : '0');
    } catch {
      /* storage unavailable */
    }
    set({ muted });
  },
}));
