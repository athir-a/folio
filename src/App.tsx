import { useEffect } from 'react';
import { LibraryScene } from './scene/LibraryScene';
import { useLibrary } from './state/libraryStore';
import { AddBookButton } from './ui/hud/AddBookButton';
import { DropOverlay } from './ui/hud/DropOverlay';
import { EmptyShelfHint } from './ui/hud/EmptyShelfHint';
import { LoadingScreen } from './ui/hud/LoadingScreen';
import { Toast } from './ui/hud/Toast';
import { TopBar } from './ui/hud/TopBar';
import { Reader } from './ui/reader/Reader';

export function App() {
  const init = useLibrary((s) => s.init);
  const reading = useLibrary((s) => s.readerOpen);

  useEffect(() => {
    void init();
  }, [init]);

  return (
    <div className="app">
      <div className="scene">
        <LibraryScene />
      </div>
      <div className={`hud ${reading ? 'hud--hidden' : ''}`}>
        <TopBar />
        <EmptyShelfHint />
        <AddBookButton />
      </div>
      <Toast />
      <DropOverlay />
      <Reader />
      <LoadingScreen />
    </div>
  );
}
