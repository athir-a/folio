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

interface LibrarySchema extends DBSchema {
  books: { key: string; value: BookRecord; indexes: { addedAt: number } };
  files: { key: string; value: Blob };
  covers: { key: string; value: Blob };
}

let dbPromise: Promise<IDBPDatabase<LibrarySchema>> | null = null;

function db() {
  dbPromise ??= openDB<LibrarySchema>('cozy-library', 1, {
    upgrade(database) {
      const books = database.createObjectStore('books', { keyPath: 'id' });
      books.createIndex('addedAt', 'addedAt');
      database.createObjectStore('files');
      database.createObjectStore('covers');
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
  const tx = (await db()).transaction(['books', 'files', 'covers'], 'readwrite');
  await Promise.all([
    tx.objectStore('books').delete(id),
    tx.objectStore('files').delete(id),
    tx.objectStore('covers').delete(id),
    tx.done,
  ]);
}

export async function getBookFile(id: string): Promise<Blob | undefined> {
  return (await db()).get('files', id);
}

export async function getCover(id: string): Promise<Blob | undefined> {
  return (await db()).get('covers', id);
}
