import { useSettings } from '../../state/settingsStore';

/** Sound toggle, shown in the top-right corner everywhere. */
export function SettingsButtons() {
  const muted = useSettings((s) => s.muted);
  const toggleMute = useSettings((s) => s.toggleMute);

  return (
    <div className="settings">
      <button className="btn btn--icon" onClick={toggleMute} aria-label={muted ? 'Unmute sounds' : 'Mute sounds'} title={muted ? 'Sound off' : 'Sound on'}>
        {muted ? 'Sound: off' : 'Sound: on'}
      </button>
    </div>
  );
}
