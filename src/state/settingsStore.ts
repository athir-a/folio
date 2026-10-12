import { create } from 'zustand';

/** Viewer preferences, remembered in localStorage. */

export type Quality = 'high' | 'low';

interface SettingsState {
  muted: boolean;
  quality: Quality;
  toggleMute: () => void;
  toggleQuality: () => void;
}

const KEY = 'cozy-library:settings';

function load(): Pick<SettingsState, 'muted' | 'quality'> {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) ?? '{}');
    return { muted: saved.muted === true, quality: saved.quality === 'low' ? 'low' : 'high' };
  } catch {
    return { muted: false, quality: 'high' };
  }
}

function save(state: Pick<SettingsState, 'muted' | 'quality'>) {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
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
  toggleQuality() {
    set({ quality: get().quality === 'high' ? 'low' : 'high' });
    save(get());
  },
}));
