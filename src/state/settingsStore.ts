import { create } from 'zustand';

/** Viewer preferences, remembered in localStorage. */

interface SettingsState {
  muted: boolean;
  toggleMute: () => void;
}

const KEY = 'cozy-library:settings';

function load(): Pick<SettingsState, 'muted'> {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) ?? '{}');
    return { muted: saved.muted === true };
  } catch {
    return { muted: false };
  }
}

function save(state: Pick<SettingsState, 'muted'>) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ muted: state.muted }));
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
}));
