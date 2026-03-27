import { create } from 'zustand';

export type PeopleSortMode = 'urgency' | 'recently-added' | 'name';
export type DueFilter = 'all' | 'due' | 'overdue' | 'upcoming';

interface UiState {
  peopleSortMode: PeopleSortMode;
  dueFilter: DueFilter;
  themeMode: 'system' | 'light';
  setPeopleSortMode: (mode: PeopleSortMode) => void;
  setDueFilter: (filter: DueFilter) => void;
}

export const useUiStore = create<UiState>((set) => ({
  peopleSortMode: 'urgency',
  dueFilter: 'all',
  themeMode: 'system',
  setPeopleSortMode: (peopleSortMode) => set({ peopleSortMode }),
  setDueFilter: (dueFilter) => set({ dueFilter }),
}));
