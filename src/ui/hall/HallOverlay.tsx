import { useLibrary } from '../../state/libraryStore';
import { useView } from '../../state/viewStore';

/** The dashboard: a little title sign and the way to your shelf. */
export function HallOverlay() {
  const count = useLibrary((s) => s.books.length);
  const goTo = useView((s) => s.goTo);

  return (
    <div className="hall-overlay">
      <header className="hall-title panel">
        <h1>Folio</h1>
        <p>a little library under the stars</p>
      </header>

      <div className="hall-cta">
        <button className="btn btn--primary btn--large" onClick={() => goTo('shelf')}>
          Go to my shelf
        </button>
        <span className="hall-cta__caption">
          {count === 0 ? 'your shelf is waiting for its first book' : `${count} ${count === 1 ? 'book' : 'books'} on your shelf`}
        </span>
      </div>
    </div>
  );
}
