import { useEffect } from 'react';
import { LibraryScene } from './scene/LibraryScene';
import { useLibrary } from './state/libraryStore';
import { useView } from './state/viewStore';
import { DropOverlay } from './ui/common/DropOverlay';
import { LoadingScreen } from './ui/common/LoadingScreen';
import { SettingsButtons } from './ui/common/SettingsButtons';
import { Toast } from './ui/common/Toast';
import { HallOverlay } from './ui/hall/HallOverlay';
import { Reader } from './ui/reader/Reader';
import { ShelfOverlay } from './ui/shelf/ShelfOverlay';

export function App() {
  const init = useLibrary((s) => s.init);
  const reading = useLibrary((s) => s.readerOpen);
  const view = useView((s) => s.view);
  const arrived = useView((s) => s.arrived);

  useEffect(() => {
    void init();
  }, [init]);

  // overlays fade out while walking, and in once the camera arrives
  const show = arrived && !reading;
  return (
    <div className="app">
      <div className="scene">
        <LibraryScene />
      </div>
      <div className={`hud ${show ? '' : 'hud--hidden'}`}>
        {view === 'hall' ? <HallOverlay /> : <ShelfOverlay />}
      </div>
      <div className={`hud hud--settings ${reading ? 'hud--hidden' : ''}`}>
        <SettingsButtons />
      </div>
      <Toast />
      <DropOverlay />
      <Reader />
      <LoadingScreen />
    </div>
  );
}
