import { create } from 'zustand';

/** Viewer preferences, remembered in localStorage. */

interface SettingsState {
  muted: boolean;
  /** Turn pages by waving at the webcam while reading. */
  gestures: boolean;
  toggleMute: () => void;
  toggleGestures: () => void;
}

type Saved = Pick<SettingsState, 'muted' | 'gestures'>;

const KEY = 'cozy-library:settings';

function load(): Saved {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) ?? '{}');
    return { muted: saved.muted === true, gestures: saved.gestures === true };
  } catch {
    return { muted: false, gestures: false };
  }
}

function save(state: Saved) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ muted: state.muted, gestures: state.gestures }));
  } catch {
    /* storage unavailable */
  }
}

export const useSettings = create<SettingsState>((set, get) => ({
  ...load(),
  toggleMute() {
    set({ muted: !get().muted });
    save(get());
  },
  toggleGestures() {
    set({ gestures: !get().gestures });
    save(get());
  },
}));
