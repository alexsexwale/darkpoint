import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { User, Session } from "@supabase/supabase-js";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";

interface AuthState {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  isInitialized: boolean;
  error: string | null;
}

interface AuthActions {
  setUser: (user: User | null) => void;
  setSession: (session: Session | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setInitialized: (initialized: boolean) => void;
  
  // Auth actions
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signUp: (email: string, password: string, metadata?: { firstName?: string; lastName?: string; username?: string }) => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ success: boolean; error?: string }>;
  updatePassword: (password: string) => Promise<{ success: boolean; error?: string }>;
  
  // OAuth
  signInWithGoogle: () => Promise<{ success: boolean; error?: string }>;
  signInWithGithub: () => Promise<{ success: boolean; error?: string }>;
  
  // Session management
  initialize: () => Promise<void>;
  refreshSession: () => Promise<void>;
}

const initialState: AuthState = {
  user: null,
  session: null,
  isLoading: true,
  isInitialized: false,
  error: null,
};

export const useAuthStore = create<AuthState & AuthActions>()(
  persist(
    (set, get) => ({
      ...initialState,

      setUser: (user) => set({ user }),
      setSession: (session) => set({ session }),
      setLoading: (isLoading) => set({ isLoading }),
      setError: (error) => set({ error }),
      setInitialized: (isInitialized) => set({ isInitialized }),

      initialize: async () => {
        if (!isSupabaseConfigured()) {
          set({ isLoading: false, isInitialized: true });
          return;
        }

        try {
          const { data: { session }, error } = await supabase.auth.getSession();
          
          if (error) {
            console.error("Error getting session:", error);
            set({ error: error.message, isLoading: false, isInitialized: true });
            return;
          }

          set({
            session,
            user: session?.user ?? null,
            isLoading: false,
            isInitialized: true,
            error: null,
          });

          // Listen for auth changes
          supabase.auth.onAuthStateChange((_event, session) => {
            set({
              session,
              user: session?.user ?? null,
            });
          });
        } catch (error) {
          console.error("Error initializing auth:", error);
          set({ isLoading: false, isInitialized: true });
        }
      },

      refreshSession: async () => {
        if (!isSupabaseConfigured()) return;

        try {
          const { data: { session }, error } = await supabase.auth.refreshSession();
          if (error) throw error;
          
          set({
            session,
            user: session?.user ?? null,
          });
        } catch (error) {
          console.error("Error refreshing session:", error);
        }
      },

      signIn: async (email, password) => {
        if (!isSupabaseConfigured()) {
          return { success: false, error: "Authentication is not configured" };
        }

        set({ isLoading: true, error: null });

        try {
          const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
          });

          if (error) {
            set({ error: error.message, isLoading: false });
            return { success: false, error: error.message };
          }

          set({
            user: data.user,
            session: data.session,
            isLoading: false,
            error: null,
          });

          return { success: true };
        } catch (error) {
          const message = error instanceof Error ? error.message : "Sign in failed";
          set({ error: message, isLoading: false });
          return { success: false, error: message };
        }
      },

      signUp: async (email, password, metadata) => {
        if (!isSupabaseConfigured()) {
          return { success: false, error: "Authentication is not configured" };
        }

        set({ isLoading: true, error: null });

        try {
          const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
              data: {
                username: metadata?.username || email.split("@")[0],
                full_name: metadata?.firstName && metadata?.lastName 
                  ? `${metadata.firstName} ${metadata.lastName}` 
                  : undefined,
                first_name: metadata?.firstName,
                last_name: metadata?.lastName,
              },
              emailRedirectTo: `${window.location.origin}/auth/callback`,
            },
          });

          if (error) {
            set({ error: error.message, isLoading: false });
            return { success: false, error: error.message };
          }

          // Check if email confirmation is required
          if (data.user && !data.session) {
            set({ isLoading: false });
            return { 
              success: true, 
              error: "Please check your email to confirm your account" 
            };
          }

          set({
            user: data.user,
            session: data.session,
            isLoading: false,
            error: null,
          });

          return { success: true };
        } catch (error) {
          const message = error instanceof Error ? error.message : "Sign up failed";
          set({ error: message, isLoading: false });
          return { success: false, error: message };
        }
      },

      signOut: async () => {
        if (!isSupabaseConfigured()) return;

        set({ isLoading: true });

        try {
          await supabase.auth.signOut();
          set({
            user: null,
            session: null,
            isLoading: false,
            error: null,
          });
        } catch (error) {
          console.error("Error signing out:", error);
          set({ isLoading: false });
        }
      },

      resetPassword: async (email) => {
        if (!isSupabaseConfigured()) {
          return { success: false, error: "Authentication is not configured" };
        }

        set({ isLoading: true, error: null });

        try {
          const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: `${window.location.origin}/reset-password`,
          });

          if (error) {
            set({ error: error.message, isLoading: false });
            return { success: false, error: error.message };
          }

          set({ isLoading: false });
          return { success: true };
        } catch (error) {
          const message = error instanceof Error ? error.message : "Password reset failed";
          set({ error: message, isLoading: false });
          return { success: false, error: message };
        }
      },

      updatePassword: async (password) => {
        if (!isSupabaseConfigured()) {
          return { success: false, error: "Authentication is not configured" };
        }

        set({ isLoading: true, error: null });

        try {
          const { error } = await supabase.auth.updateUser({
            password,
          });

          if (error) {
            set({ error: error.message, isLoading: false });
            return { success: false, error: error.message };
          }

          set({ isLoading: false });
          return { success: true };
        } catch (error) {
          const message = error instanceof Error ? error.message : "Password update failed";
          set({ error: message, isLoading: false });
          return { success: false, error: message };
        }
      },

      signInWithGoogle: async () => {
        if (!isSupabaseConfigured()) {
          return { success: false, error: "Authentication is not configured" };
        }

        try {
          const { error } = await supabase.auth.signInWithOAuth({
            provider: "google",
            options: {
              redirectTo: `${window.location.origin}/auth/callback`,
            },
          });

          if (error) {
            return { success: false, error: error.message };
          }

          return { success: true };
        } catch (error) {
          const message = error instanceof Error ? error.message : "Google sign in failed";
          return { success: false, error: message };
        }
      },

      signInWithGithub: async () => {
        if (!isSupabaseConfigured()) {
          return { success: false, error: "Authentication is not configured" };
        }

        try {
          const { error } = await supabase.auth.signInWithOAuth({
            provider: "github",
            options: {
              redirectTo: `${window.location.origin}/auth/callback`,
            },
          });

          if (error) {
            return { success: false, error: error.message };
          }

          return { success: true };
        } catch (error) {
          const message = error instanceof Error ? error.message : "GitHub sign in failed";
          return { success: false, error: message };
        }
      },
    }),
    {
      name: "darkpoint-auth",
      partialize: (state) => ({
        // Only persist non-sensitive data
        isInitialized: state.isInitialized,
      }),
    }
  )
);

