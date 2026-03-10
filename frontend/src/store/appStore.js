import { create } from 'zustand';

export const useAppStore = create((set) => ({
  systemStatus: null,
  settings: null,
  setSystemStatus: (systemStatus) => set({ systemStatus }),
  setSettings: (settings) => set({ settings }),
}));