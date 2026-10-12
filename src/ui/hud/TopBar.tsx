import { useLibrary } from '../../state/libraryStore';

export function TopBar() {
  const count = useLibrary((s) => s.books.length);
  const muted = useLibrary((s) => s.muted);
  const toggleMute = useLibrary((s) => s.toggleMute);

  return (
    <header className="top-bar">
      <div className="brand">
        <h1>My Little Library</h1>
        <p>{count === 0 ? 'An empty shelf, waiting for stories' : `${count} ${count === 1 ? 'book' : 'books'} on the shelf`}</p>
      </div>
      <button className="icon-button" onClick={toggleMute} aria-label={muted ? 'Unmute sounds' : 'Mute sounds'} title={muted ? 'Sounds off' : 'Sounds on'}>
        {muted ? (
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9H4z" /><path d="M16 9l5 6M21 9l-5 6" fill="none" /></svg>
        ) : (
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9H4z" /><path d="M16 8.5a5 5 0 010 7M18.5 6a8.5 8.5 0 010 12" fill="none" /></svg>
        )}
      </button>
    </header>
  );
}
