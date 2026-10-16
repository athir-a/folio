import { openDB, type DBSchema, type IDBPDatabase } from 'idb';

export interface BookRecord {
  id: string;
  title: string;
  author?: string;
  fileName: string;
  fileSize: number;
  pageCount: number;
  /** Spine colour, derived from the cover. */
  color: string;
  addedAt: number;
  /** 1-based page the reader was last on. */
  lastPage: number;
  lastReadAt?: number;
}

/** A rectangle on a page, as fractions (0..1) of the page's width and height. */
export interface PageRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** A highlight over some text, or a sticky note pinned to a spot on the page. */
export interface Annotation {
  id: string;
  bookId: string;
  page: number;
  kind: 'highlight' | 'note';
  color: string;
  /** Highlights: the lines of text covered. */
  rects?: PageRect[];
  /** Highlights: the text that was selected. */
  quote?: string;
  /** Notes: where the pin sits, as fractions of the page. */
  x?: number;
  y?: number;
  comment: string;
  createdAt: number;
  updatedAt: number;
}

interface LibrarySchema extends DBSchema {
  books: { key: string; value: BookRecord; indexes: { addedAt: number } };
  files: { key: string; value: Blob };
  covers: { key: string; value: Blob };
  annotations: { key: string; value: Annotation; indexes: { bookId: string } };
}

let dbPromise: Promise<IDBPDatabase<LibrarySchema>> | null = null;

function db() {
  dbPromise ??= openDB<LibrarySchema>('cozy-library', 2, {
    upgrade(database, oldVersion) {
      if (oldVersion < 1) {
        const books = database.createObjectStore('books', { keyPath: 'id' });
        books.createIndex('addedAt', 'addedAt');
        database.createObjectStore('files');
        database.createObjectStore('covers');
      }
      if (oldVersion < 2) {
        const annotations = database.createObjectStore('annotations', { keyPath: 'id' });
        annotations.createIndex('bookId', 'bookId');
      }
    },
  });
  return dbPromise;
}

export async function getAllBooks(): Promise<BookRecord[]> {
  return (await db()).getAllFromIndex('books', 'addedAt');
}

export async function addBook(book: BookRecord, file: Blob, cover: Blob | null) {
  const tx = (await db()).transaction(['books', 'files', 'covers'], 'readwrite');
  await Promise.all([
    tx.objectStore('books').put(book),
    tx.objectStore('files').put(file, book.id),
    cover ? tx.objectStore('covers').put(cover, book.id) : Promise.resolve(),
    tx.done,
  ]);
}

export async function updateBook(id: string, patch: Partial<BookRecord>) {
  const d = await db();
  const existing = await d.get('books', id);
  if (existing) await d.put('books', { ...existing, ...patch });
}

export async function deleteBook(id: string) {
  const d = await db();
  const notes = await d.getAllKeysFromIndex('annotations', 'bookId', id);
  const tx = d.transaction(['books', 'files', 'covers', 'annotations'], 'readwrite');
  await Promise.all([
    tx.objectStore('books').delete(id),
    tx.objectStore('files').delete(id),
    tx.objectStore('covers').delete(id),
    ...notes.map((key) => tx.objectStore('annotations').delete(key)),
    tx.done,
  ]);
}

export async function getBookFile(id: string): Promise<Blob | undefined> {
  return (await db()).get('files', id);
}

export async function getCover(id: string): Promise<Blob | undefined> {
  return (await db()).get('covers', id);
}

export async function getAnnotations(bookId: string): Promise<Annotation[]> {
  return (await db()).getAllFromIndex('annotations', 'bookId', bookId);
}

export async function putAnnotation(annotation: Annotation) {
  await (await db()).put('annotations', annotation);
}

export async function deleteAnnotation(id: string) {
  await (await db()).delete('annotations', id);
}
