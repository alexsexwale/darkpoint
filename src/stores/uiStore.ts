import { create } from "zustand";

type AuthModalMode = "login" | "register";

interface UIState {
  // Preloader
  isPreloaderVisible: boolean;
  isInitialLoad: boolean;
  
  // Modals
  isSearchOpen: boolean;
  isSignInOpen: boolean;
  signInModalMode: AuthModalMode;
  isForgotPasswordOpen: boolean;
  isSideNavOpen: boolean;
  isMobileMenuOpen: boolean;
  
  // Scroll
  scrollY: number;
  isScrollingUp: boolean;
  
  // Theme
  isAudioEnabled: boolean;
}

interface UIActions {
  // Preloader
  showPreloader: () => void;
  hidePreloader: () => void;
  setInitialLoadComplete: () => void;
  
  // Search
  openSearch: () => void;
  closeSearch: () => void;
  toggleSearch: () => void;
  
  // Sign In
  openSignIn: (mode?: AuthModalMode) => void;
  closeSignIn: () => void;
  toggleSignIn: () => void;
  
  // Forgot Password
  openForgotPassword: () => void;
  closeForgotPassword: () => void;
  
  // Side Nav
  openSideNav: () => void;
  closeSideNav: () => void;
  toggleSideNav: () => void;
  
  // Mobile Menu
  openMobileMenu: () => void;
  closeMobileMenu: () => void;
  toggleMobileMenu: () => void;
  
  // Scroll
  setScrollY: (y: number) => void;
  setIsScrollingUp: (isUp: boolean) => void;
  
  // Audio
  toggleAudio: () => void;
  setAudioEnabled: (enabled: boolean) => void;
  
  // Close all modals
  closeAllModals: () => void;
}

type UIStore = UIState & UIActions;

export const useUIStore = create<UIStore>((set, get) => ({
  // Initial state
  isPreloaderVisible: true,
  isInitialLoad: true,
  isSearchOpen: false,
  isSignInOpen: false,
  signInModalMode: "login" as AuthModalMode,
  isForgotPasswordOpen: false,
  isSideNavOpen: false,
  isMobileMenuOpen: false,
  scrollY: 0,
  isScrollingUp: true,
  isAudioEnabled: false,

  // Preloader
  showPreloader: () => set({ isPreloaderVisible: true }),
  hidePreloader: () => set({ isPreloaderVisible: false }),
  setInitialLoadComplete: () => set({ isInitialLoad: false }),

  // Search
  openSearch: () => {
    get().closeAllModals();
    set({ isSearchOpen: true });
  },
  closeSearch: () => set({ isSearchOpen: false }),
  toggleSearch: () => {
    if (get().isSearchOpen) {
      set({ isSearchOpen: false });
    } else {
      get().openSearch();
    }
  },

  // Sign In
  openSignIn: (mode: AuthModalMode = "login") => {
    get().closeAllModals();
    set({ isSignInOpen: true, signInModalMode: mode });
  },
  closeSignIn: () => set({ isSignInOpen: false }),
  toggleSignIn: () => {
    if (get().isSignInOpen) {
      set({ isSignInOpen: false });
    } else {
      get().openSignIn();
    }
  },

  // Forgot Password
  openForgotPassword: () => {
    get().closeAllModals();
    set({ isForgotPasswordOpen: true });
  },
  closeForgotPassword: () => set({ isForgotPasswordOpen: false }),

  // Side Nav
  openSideNav: () => {
    get().closeAllModals();
    set({ isSideNavOpen: true });
  },
  closeSideNav: () => set({ isSideNavOpen: false }),
  toggleSideNav: () => {
    if (get().isSideNavOpen) {
      set({ isSideNavOpen: false });
    } else {
      get().openSideNav();
    }
  },

  // Mobile Menu
  openMobileMenu: () => {
    get().closeAllModals();
    set({ isMobileMenuOpen: true });
  },
  closeMobileMenu: () => set({ isMobileMenuOpen: false }),
  toggleMobileMenu: () => {
    if (get().isMobileMenuOpen) {
      set({ isMobileMenuOpen: false });
    } else {
      get().openMobileMenu();
    }
  },

  // Scroll
  setScrollY: (y) => set({ scrollY: y }),
  setIsScrollingUp: (isUp) => set({ isScrollingUp: isUp }),

  // Audio
  toggleAudio: () => set({ isAudioEnabled: !get().isAudioEnabled }),
  setAudioEnabled: (enabled) => set({ isAudioEnabled: enabled }),

  // Close all modals
  closeAllModals: () =>
    set({
      isSearchOpen: false,
      isSignInOpen: false,
      isForgotPasswordOpen: false,
      isSideNavOpen: false,
      isMobileMenuOpen: false,
    }),
}));
