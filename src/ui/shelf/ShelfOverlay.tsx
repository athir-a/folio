import { useLibrary } from '../../state/libraryStore';
import { useView } from '../../state/viewStore';
import { AddBookButton } from './AddBookButton';
import { EmptyShelfHint } from './EmptyShelfHint';

/** Controls shown while standing in front of your shelf. */
export function ShelfOverlay() {
  const count = useLibrary((s) => s.books.length);
  const goTo = useView((s) => s.goTo);

  return (
    <div className="shelf-overlay">
      <button className="btn btn--ghost shelf-back" onClick={() => goTo('hall')}>
        <span aria-hidden="true">←</span> Back to the hall
      </button>
      <div className="shelf-title">
        <h2>Your Shelf</h2>
        <span>{count === 0 ? 'empty, for now' : `${count} ${count === 1 ? 'volume' : 'volumes'}`}</span>
      </div>
      <EmptyShelfHint />
      <AddBookButton />
    </div>
  );
}
