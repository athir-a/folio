import { useMemo } from 'react';
import { useLibrary } from '../../state/libraryStore';
import { Book } from './Book';
import { computeLayout } from './layout';

/** Lays out every book in the library and renders it in its slot. */
export function Books() {
  const books = useLibrary((s) => s.books);
  const coverUrls = useLibrary((s) => s.coverUrls);
  const layout = useMemo(() => computeLayout(books), [books]);

  return (
    <>
      {books.map((book) => {
        const slot = layout.get(book.id);
        return slot ? <Book key={book.id} book={book} slot={slot} coverUrl={coverUrls[book.id]} /> : null;
      })}
    </>
  );
}
