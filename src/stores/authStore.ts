import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { User, Session } from "@supabase/supabase-js";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";

// Helper function to send welcome email
async function sendWelcomeEmail(email: string, username?: string) {
  try {
    // Generate coupon code on the client side as fallback
    const couponCode = `WELCOME-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
    
    const response = await fetch("/api/email/welcome", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, username, couponCode }),
    });
    
    if (!response.ok) {
      console.warn("Failed to send welcome email:", await response.text());
    }
  } catch (error) {
    console.warn("Error sending welcome email:", error);
    // Don't fail signup if email fails
  }
}

// Helper function to subscribe user to newsletter (without sending newsletter email)
async function subscribeToNewsletter(userId: string, email: string) {
  try {
    // Update user profile to mark as newsletter subscribed
    await supabase
      .from("user_profiles")
      .update({ 
        newsletter_subscribed: true,
        email: email.toLowerCase()
      } as never)
      .eq("id", userId);

    // Also add to newsletter_subscribers table for tracking
    await supabase
      .from("newsletter_subscribers")
      .upsert([{
        email: email.toLowerCase(),
        is_subscribed: true,
        source: "registration",
        subscribed_at: new Date().toISOString()
      }] as never, { 
        onConflict: "email" 
      });

    console.log("User subscribed to newsletter:", email);
  } catch (error) {
    console.warn("Error subscribing to newsletter:", error);
    // Don't fail signup if newsletter subscription fails
  }
}

interface AuthState {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  isInitialized: boolean;
  error: string | null;
  isAuthenticated: boolean;
}

interface AuthActions {
  setUser: (user: User | null) => void;
  setSession: (session: Session | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setInitialized: (initialized: boolean) => void;
  
  // Auth actions
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signUp: (email: string, password: string, metadata?: { firstName?: string; lastName?: string; username?: string; referralCode?: string }) => Promise<{ success: boolean; error?: string }>;
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
  isAuthenticated: false,
};

export const useAuthStore = create<AuthState & AuthActions>()(
  persist(
    (set, get) => ({
      ...initialState,

      setUser: (user) => set({ user, isAuthenticated: !!user }),
      setSession: (session) => set({ session, user: session?.user ?? null, isAuthenticated: !!session }),
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
            isAuthenticated: !!session,
            isLoading: false,
            isInitialized: true,
            error: null,
          });

          // Listen for auth changes
          supabase.auth.onAuthStateChange((_event, session) => {
            set({
              session,
              user: session?.user ?? null,
              isAuthenticated: !!session,
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
            isAuthenticated: !!session,
          });
        } catch (error) {
          console.error("Error refreshing session:", error);
        }
      },

      signIn: async (emailOrUsername, password) => {
        if (!isSupabaseConfigured()) {
          return { success: false, error: "Authentication is not configured" };
        }

        set({ isLoading: true, error: null });

        try {
          let email = emailOrUsername;

          // Check if input is a username (doesn't contain @)
          if (!emailOrUsername.includes("@")) {
            // Look up email by username from user_profiles
            type ProfileLookup = { email: string | null; id: string };
            const { data: profileData, error: profileError } = await supabase
              .from("user_profiles")
              .select("email, id")
              .eq("username", emailOrUsername.toLowerCase())
              .single<ProfileLookup>();

            if (profileError || !profileData?.email) {
              // Try the RPC function as fallback (in case email column doesn't exist yet)
              try {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const { data: rpcData, error: rpcError } = await (supabase as any)
                  .rpc("get_email_by_username", { lookup_username: emailOrUsername });

                if (rpcError || !rpcData) {
                  set({ error: "Invalid username or password", isLoading: false });
                  return { success: false, error: "Invalid username or password" };
                }
                email = rpcData as string;
              } catch {
                set({ error: "Invalid username or password", isLoading: false });
                return { success: false, error: "Invalid username or password" };
              }
            } else {
              email = profileData.email;
            }
          }

          const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
          });

          if (error) {
            // Provide friendlier error message
            const errorMessage = error.message.includes("Invalid login credentials")
              ? "Invalid email/username or password"
              : error.message;
            set({ error: errorMessage, isLoading: false });
            return { success: false, error: errorMessage };
          }

          set({
            user: data.user,
            session: data.session,
            isAuthenticated: true,
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
                referral_code: metadata?.referralCode || null,
              },
              emailRedirectTo: `${window.location.origin}/auth/callback`,
            },
          });

          if (error) {
            // Provide more user-friendly error messages
            let errorMessage = error.message;
            
            if (error.message.includes("Database error") || error.message.includes("500") || error.message.includes("Internal Server Error")) {
              errorMessage = "Database error saving new user. Please try again or contact support.";
            } else if (error.message.includes("User already registered") || error.message.includes("already registered")) {
              errorMessage = "An account with this email already exists. Please sign in instead.";
            } else if (error.message.includes("Password") || error.message.includes("password")) {
              errorMessage = "Password does not meet requirements. Please use a stronger password.";
            } else if (error.message.includes("Email") || error.message.includes("email")) {
              errorMessage = "Invalid email address. Please check and try again.";
            }
            
            set({ error: errorMessage, isLoading: false });
            return { success: false, error: errorMessage };
          }

          // Check if email confirmation is required
          if (data.user && !data.session) {
            // Send welcome email even if confirmation is needed
            sendWelcomeEmail(email, metadata?.username || email.split("@")[0]);
            // Subscribe to newsletter (doesn't send newsletter email)
            subscribeToNewsletter(data.user.id, email);
            
            set({ isLoading: false });
            return { 
              success: true, 
              error: "Please check your email to confirm your account" 
            };
          }

          // Send welcome email and subscribe to newsletter for immediate signup
          if (data.user) {
            sendWelcomeEmail(email, metadata?.username || email.split("@")[0]);
            // Subscribe to newsletter (doesn't send newsletter email)
            subscribeToNewsletter(data.user.id, email);
          }

          set({
            user: data.user,
            session: data.session,
            isAuthenticated: !!data.session,
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
            isAuthenticated: false,
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

