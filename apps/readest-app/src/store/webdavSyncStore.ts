import { create } from 'zustand';

export type WebDAVSyncStatus = 'idle' | 'syncing' | 'success' | 'error';

export interface WebDAVSyncState {
  status: WebDAVSyncStatus;
  progress: number;
  currentBook?: string;
  lastSyncTime?: number;
  syncErrors: string[];
  conflictsDetected: number;
  isSyncing: boolean;
  progressLabel: string;
  setStatus: (status: WebDAVSyncStatus) => void;
  setProgress: (progress: number) => void;
  setCurrentBook: (book?: string) => void;
  setLastSyncTime: (time?: number) => void;
  addSyncError: (error: string) => void;
  clearSyncErrors: () => void;
  setConflictsDetected: (count: number) => void;
  reset: () => void;
  beginSync: (label?: string) => void;
  updateProgress: (label: string, progress?: number) => void;
  finishSync: (success: boolean) => void;
  endSync: () => void;
}

export const useWebDAVSyncStore = create<WebDAVSyncState>((set, get) => ({
  status: 'idle',
  progress: 0,
  currentBook: undefined,
  lastSyncTime: undefined,
  syncErrors: [],
  conflictsDetected: 0,
  isSyncing: false,
  progressLabel: '',
  setStatus: (status) => set({ status }),
  setProgress: (progress) => set({ progress }),
  setCurrentBook: (book) => set({ currentBook: book }),
  setLastSyncTime: (time) => set({ lastSyncTime: time }),
  addSyncError: (error) => set((state) => ({ syncErrors: [...state.syncErrors, error] })),
  clearSyncErrors: () => set({ syncErrors: [] }),
  setConflictsDetected: (count) => set({ conflictsDetected: count }),
  reset: () =>
    set({
      status: 'idle',
      progress: 0,
      currentBook: undefined,
      syncErrors: [],
      conflictsDetected: 0,
      isSyncing: false,
      progressLabel: '',
    }),
  beginSync: (label?: string) =>
    set({
      status: 'syncing',
      progress: 0,
      isSyncing: true,
      progressLabel: label || '',
      syncErrors: [],
      conflictsDetected: 0,
    }),
  updateProgress: (label, progress) =>
    set((state) => ({
      progress: progress !== undefined ? progress : state.progress,
      progressLabel: label,
      currentBook: label,
    })),
  finishSync: (success) =>
    set({
      status: success ? 'success' : 'error',
      isSyncing: false,
      lastSyncTime: success ? Date.now() : get().lastSyncTime,
    }),
  endSync: () =>
    set({
      status: 'idle',
      progress: 0,
      isSyncing: false,
      progressLabel: '',
    }),
}));
