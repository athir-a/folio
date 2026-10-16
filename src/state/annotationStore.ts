import { create } from 'zustand';
import * as db from '../db/libraryDb';
import type { Annotation } from '../db/libraryDb';

export type Tool = 'select' | 'highlight' | 'note';

/** Highlighter colours, as in most PDF readers. */
export const HIGHLIGHT_COLOURS = ['#ffd84a', '#8fe388', '#7cc4ff', '#ff9ac8'];

interface AnnotationState {
  bookId: string | null;
  list: Annotation[];
  tool: Tool;
  colour: string;
  /** The annotation being looked at or edited. */
  activeId: string | null;
  panelOpen: boolean;
  load: (bookId: string) => Promise<void>;
  add: (a: Omit<Annotation, 'id' | 'bookId' | 'createdAt' | 'updatedAt'>) => Annotation | null;
  update: (id: string, patch: Partial<Pick<Annotation, 'comment' | 'color' | 'x' | 'y'>>) => void;
  remove: (id: string) => void;
  setTool: (tool: Tool) => void;
  setColour: (colour: string) => void;
  setActive: (id: string | null) => void;
  setPanelOpen: (open: boolean) => void;
}

const writes = new Map<string, ReturnType<typeof setTimeout>>();

/** Saves shortly after the last change, so typing a comment doesn't hit the database per key. */
function persist(a: Annotation) {
  clearTimeout(writes.get(a.id));
  writes.set(
    a.id,
    setTimeout(() => {
      writes.delete(a.id);
      void db.putAnnotation(a);
    }, 300),
  );
}

export const useAnnotations = create<AnnotationState>((set, get) => ({
  bookId: null,
  list: [],
  tool: 'select',
  colour: HIGHLIGHT_COLOURS[0],
  activeId: null,
  panelOpen: false,

  async load(bookId) {
    set({ bookId, list: [], activeId: null });
    const list = await db.getAnnotations(bookId);
    if (get().bookId === bookId) set({ list });
  },

  add(fields) {
    const { bookId } = get();
    if (!bookId) return null;
    const now = Date.now();
    const a: Annotation = { ...fields, id: crypto.randomUUID(), bookId, createdAt: now, updatedAt: now };
    set((s) => ({ list: [...s.list, a] }));
    void db.putAnnotation(a);
    return a;
  },

  update(id, patch) {
    let updated: Annotation | undefined;
    set((s) => ({
      list: s.list.map((a) => (a.id === id ? (updated = { ...a, ...patch, updatedAt: Date.now() }) : a)),
    }));
    if (updated) persist(updated);
  },

  remove(id) {
    clearTimeout(writes.get(id));
    writes.delete(id);
    set((s) => ({ list: s.list.filter((a) => a.id !== id), activeId: s.activeId === id ? null : s.activeId }));
    void db.deleteAnnotation(id);
  },

  setTool: (tool) => set({ tool }),
  setColour: (colour) => set({ colour }),
  setActive: (activeId) => set({ activeId }),
  setPanelOpen: (panelOpen) => set({ panelOpen }),
}));

/** Annotations in reading order: by page, then top to bottom. */
export function sortAnnotations(list: Annotation[]) {
  const top = (a: Annotation) => a.y ?? a.rects?.[0]?.y ?? 0;
  return [...list].sort((a, b) => a.page - b.page || top(a) - top(b));
}
