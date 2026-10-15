import { create } from 'zustand';
import * as db from '../db/libraryDb';
import type { BookRecord } from '../db/libraryDb';
import { extractBookInfo } from '../pdf/pdf';
import { playChime, playOpenBook } from '../lib/sfx';
import { useSettings } from './settingsStore';
import { useView } from './viewStore';

/**
 * Central library state. The UI, the pixel scenes and (later) gesture input all call
 * these actions, so new input methods only need to call e.g. `openBook`.
 */

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
  /** Books waiting for, or playing, their "new book" animation on the shelf. */
  entering: Record<string, true>;
  busy: number;
  selectedId: string | null;
  readerOpen: boolean;
  toast: Toast | null;

  init: () => Promise<void>;
  addFiles: (files: FileList | File[]) => Promise<void>;
  removeBook: (id: string) => Promise<void>;
  openBook: (id: string) => void;
  closeBook: () => void;
  setLastPage: (id: string, page: number) => void;
  /** Called by the shelf scene the moment a new book hits the shelf. */
  land: (id: string) => void;
  finishEnter: (id: string) => void;
  showToast: (toast: Omit<Toast, 'key'>) => void;
  dismissToast: () => void;
}

let initPromise: Promise<void> | null = null;
let toastKey = 0;
const pageWrites = new Map<string, ReturnType<typeof setTimeout>>();

const muted = () => useSettings.getState().muted;

export const useLibrary = create<LibraryState>((set, get) => ({
  books: [],
  coverUrls: {},
  loaded: false,
  entering: {},
  busy: 0,
  selectedId: null,
  readerOpen: false,
  toast: null,

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
    // new books are shelved in front of the visitor, so walk to the shelf first
    await useView.getState().whenAtShelf();

    for (const file of pdfs) {
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
      } catch (err) {
        console.error(err);
        get().showToast({ kind: 'error', title: 'Could not read that PDF', subtitle: file.name });
      } finally {
        set((s) => ({ busy: s.busy - 1 }));
      }
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
    if (!muted()) playOpenBook();
    // let the book slide off the shelf before the pages open
    setTimeout(() => {
      if (get().selectedId === id) set({ readerOpen: true });
    }, 420);
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

  land(id) {
    const s = get();
    const index = s.books.findIndex((b) => b.id === id);
    if (!muted()) playChime();
    if (index >= 0) {
      s.showToast({
        kind: 'new-book',
        title: s.books[index].title,
        subtitle: index === 0 ? 'The first volume of your collection' : `Volume ${index + 1} of your collection`,
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

  showToast(toast) {
    set({ toast: { ...toast, key: ++toastKey } });
  },

  dismissToast() {
    set({ toast: null });
  },
}));
