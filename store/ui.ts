import { create } from 'zustand';

export type PeopleSortMode = 'urgency' | 'recently-added' | 'name';
export type DueFilter = 'all' | 'due' | 'overdue' | 'upcoming';

export type ThemeMode = 'system' | 'light' | 'dark';

interface UiState {
  peopleSortMode: PeopleSortMode;
  dueFilter: DueFilter;
  themeMode: ThemeMode;
  setPeopleSortMode: (mode: PeopleSortMode) => void;
  setDueFilter: (filter: DueFilter) => void;
  setThemeMode: (mode: ThemeMode) => void;
}

export const useUiStore = create<UiState>((set) => ({
  peopleSortMode: 'urgency',
  dueFilter: 'all',
  themeMode: 'system',
  setPeopleSortMode: (peopleSortMode) => set({ peopleSortMode }),
  setDueFilter: (dueFilter) => set({ dueFilter }),
  setThemeMode: (themeMode) => set({ themeMode }),
}));
