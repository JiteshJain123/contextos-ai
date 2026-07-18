import { create } from "zustand";
import { persist } from "zustand/middleware";

/**
 * Ephemeral UI state.
 *
 * Scope: things the SERVER doesn't care about — sidebar collapsed, mobile
 * menu open, command palette open, etc. Server state (API data) goes to
 * TanStack Query. Auth state is derived from the /auth/me query.
 *
 * Persisted slice: `sidebarCollapsed` saves to localStorage so user
 * preference survives reloads. Volatile slices (mobileMenuOpen) are not
 * persisted — they reset to default on reload.
 */

interface UiState {
  // Persisted
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (collapsed: boolean) => void;
  toggleSidebar: () => void;

  // Volatile
  mobileMenuOpen: boolean;
  setMobileMenuOpen: (open: boolean) => void;
}

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      sidebarCollapsed: false,
      setSidebarCollapsed: (collapsed) => {
        set({ sidebarCollapsed: collapsed });
      },
      toggleSidebar: () => {
        set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed }));
      },

      mobileMenuOpen: false,
      setMobileMenuOpen: (open) => {
        set({ mobileMenuOpen: open });
      },
    }),
    {
      name: "contextos-ui",
      partialize: (state) => ({ sidebarCollapsed: state.sidebarCollapsed }),
    },
  ),
);
