import { create } from 'zustand';
import { useSettings } from './settingsStore';
import { playFootsteps } from '../lib/sfx';

/** Where the visitor is standing: looking down the hall, or in front of their shelf. */
export type View = 'hall' | 'shelf';

interface ViewState {
  view: View;
  /** False while the camera is still walking to `view`. */
  arrived: boolean;
  /** Walk to a view. `fromHistory` is set when the browser's back/forward buttons asked for it. */
  goTo: (view: View, fromHistory?: boolean) => void;
  markArrived: () => void;
  /** Resolves once the camera reaches the shelf (walking there first if needed). */
  whenAtShelf: () => Promise<void>;
}

/** The shelf has its own address (#shelf), so it can be bookmarked and Back returns to the hall. */
const viewFromUrl = (): View => (window.location.hash === '#shelf' ? 'shelf' : 'hall');

let arrivalWaiters: (() => void)[] = [];

export const useView = create<ViewState>((set, get) => ({
  view: viewFromUrl(),
  arrived: true,
  goTo(view, fromHistory = false) {
    if (get().view === view) return;
    if (!fromHistory) {
      const url = view === 'shelf' ? '#shelf' : window.location.pathname + window.location.search;
      window.history.pushState(null, '', url);
    }
    set({ view, arrived: false });
    if (!useSettings.getState().muted) playFootsteps();
  },
  markArrived() {
    set({ arrived: true });
    if (get().view === 'shelf') {
      arrivalWaiters.forEach((resolve) => resolve());
      arrivalWaiters = [];
    }
  },
  whenAtShelf() {
    const { view, arrived, goTo } = get();
    if (view === 'shelf' && arrived) return Promise.resolve();
    goTo('shelf');
    return new Promise((resolve) => arrivalWaiters.push(resolve));
  },
}));

window.addEventListener('popstate', () => useView.getState().goTo(viewFromUrl(), true));
