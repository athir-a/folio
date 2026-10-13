import { playClick } from '../../lib/sfx';
import { useSettings } from '../../state/settingsStore';

/** Graphics quality and sound toggles, shown in the top-right corner everywhere. */
export function SettingsButtons() {
  const muted = useSettings((s) => s.muted);
  const quality = useSettings((s) => s.quality);
  const toggleMute = useSettings((s) => s.toggleMute);
  const toggleQuality = useSettings((s) => s.toggleQuality);

  return (
    <div className="settings">
      <button
        className="btn btn--icon btn--text"
        onClick={() => {
          if (!muted) playClick();
          toggleQuality();
        }}
        aria-label={quality === 'high' ? 'Switch to faster, lower-quality graphics' : 'Switch to high-quality graphics'}
        title={quality === 'high' ? 'High quality (click for faster graphics)' : 'Fast graphics (click for high quality)'}
      >
        {quality === 'high' ? 'HQ' : 'Fast'}
      </button>
      <button className="btn btn--icon" onClick={toggleMute} aria-label={muted ? 'Unmute sounds' : 'Mute sounds'} title={muted ? 'Sounds off' : 'Sounds on'}>
        {muted ? (
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9H4z" /><path d="M16 9l5 6M21 9l-5 6" fill="none" /></svg>
        ) : (
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9H4z" /><path d="M16 8.5a5 5 0 010 7M18.5 6a8.5 8.5 0 010 12" fill="none" /></svg>
        )}
      </button>
    </div>
  );
}
