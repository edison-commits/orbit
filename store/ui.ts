import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';

export type PeopleSortMode = 'urgency' | 'recently-added' | 'name';
export type DueFilter = 'all' | 'due' | 'overdue' | 'upcoming';

export type ThemeMode = 'system' | 'light' | 'dark';

const STORAGE_KEY = 'orbit_ui_prefs';

interface UiState {
  peopleSortMode: PeopleSortMode;
  dueFilter: DueFilter;
  themeMode: ThemeMode;
  hydrated: boolean;
  setPeopleSortMode: (mode: PeopleSortMode) => void;
  setDueFilter: (filter: DueFilter) => void;
  setThemeMode: (mode: ThemeMode) => void;
  hydrate: () => Promise<void>;
}

async function loadPrefs(): Promise<Partial<UiState> | null> {
  try {
    const raw = await SecureStore.getItemAsync(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

async function savePrefs(state: Pick<UiState, 'peopleSortMode' | 'dueFilter' | 'themeMode'>) {
  try {
    await SecureStore.setItemAsync(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Silently fail — prefs are non-critical
  }
}

export const useUiStore = create<UiState>((set, get) => ({
  peopleSortMode: 'urgency',
  dueFilter: 'all',
  themeMode: 'system',
  hydrated: false,

  setPeopleSortMode: (peopleSortMode) => {
    set({ peopleSortMode });
    savePrefs({ ...getPrefs(get()), peopleSortMode });
  },

  setDueFilter: (dueFilter) => {
    set({ dueFilter });
    savePrefs({ ...getPrefs(get()), dueFilter });
  },

  setThemeMode: (themeMode) => {
    set({ themeMode });
    savePrefs({ ...getPrefs(get()), themeMode });
  },

  hydrate: async () => {
    const prefs = await loadPrefs();
    if (prefs) {
      set({
        peopleSortMode: (prefs.peopleSortMode as PeopleSortMode) ?? 'urgency',
        dueFilter: (prefs.dueFilter as DueFilter) ?? 'all',
        themeMode: (prefs.themeMode as ThemeMode) ?? 'system',
        hydrated: true,
      });
    } else {
      set({ hydrated: true });
    }
  },
}));

function getPrefs(state: UiState) {
  return {
    peopleSortMode: state.peopleSortMode,
    dueFilter: state.dueFilter,
    themeMode: state.themeMode,
  };
}
