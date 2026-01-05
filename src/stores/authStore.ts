import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { User, Session } from "@supabase/supabase-js";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";

// Helper function to check if user is returning (previously deleted)
async function checkIfReturningUser(email: string): Promise<boolean> {
  try {
    const { data, error } = await supabase.rpc("is_returning_user", { p_email: email } as never);
    if (error) {
      console.warn("Error checking returning user:", error);
      return false;
    }
    return Boolean(data);
  } catch {
    return false;
  }
}

// Helper function to send welcome email (or welcome back for returning users)
async function sendWelcomeEmail(email: string, username?: string, isReturning?: boolean) {
  try {
    // Check if returning user (if not explicitly passed)
    const isReturningUser = isReturning ?? await checkIfReturningUser(email);
    
    if (isReturningUser) {
      // Send welcome back email for returning users (no bonuses)
      const response = await fetch("/api/auth/welcome-back", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, displayName: username }),
      });
      
      if (!response.ok) {
        console.warn("Failed to send welcome back email:", await response.text());
      }
    } else {
      // Send full welcome email with bonuses for new users
      // Note: The 10% welcome discount is automatically created in the database
      // and appears in "My Rewards" - no code needed
      const response = await fetch("/api/email/welcome", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, username }),
      });
      
      if (!response.ok) {
        console.warn("Failed to send welcome email:", await response.text());
      }
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

    // Also add to newsletter_subscriptions table for tracking
    await supabase
      .from("newsletter_subscriptions")
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
  isEmailVerified: boolean;
  isResendingVerification: boolean;
  verificationResendCooldown: number; // seconds remaining
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
  
  // Email verification
  resendVerificationEmail: () => Promise<{ success: boolean; error?: string }>;
  checkEmailVerification: () => Promise<boolean>;
}

const initialState: AuthState = {
  user: null,
  session: null,
  isLoading: true,
  isInitialized: false,
  error: null,
  isAuthenticated: false,
  isEmailVerified: false,
  isResendingVerification: false,
  verificationResendCooldown: 0,
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

          // Check if email is verified (from user metadata or email_confirmed_at)
          const isEmailVerified = session?.user?.email_confirmed_at != null;

          set({
            session,
            user: session?.user ?? null,
            isAuthenticated: !!session,
            isEmailVerified,
            isLoading: false,
            isInitialized: true,
            error: null,
          });

          // Listen for auth changes
          supabase.auth.onAuthStateChange((_event, session) => {
            const verified = session?.user?.email_confirmed_at != null;
            set({
              session,
              user: session?.user ?? null,
              isAuthenticated: !!session,
              isEmailVerified: verified,
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
          // Check if this is a returning user BEFORE signup
          const isReturning = await checkIfReturningUser(email);
          
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
            // Provide more user-friendly error messages, but keep useful debug details.
            const anyErr = error as unknown as { status?: number; code?: string; name?: string; message: string };
            const status = anyErr.status;
            const code = anyErr.code;

            // Always log the full error object for debugging (users can screenshot Console).
            console.error("Supabase signUp error:", error, { status, code });

            let errorMessage = anyErr.message || "Sign up failed";

            if (
              errorMessage.includes("Database error") ||
              errorMessage.includes("500") ||
              errorMessage.includes("Internal Server Error") ||
              status === 500
            ) {
              errorMessage =
                "Signup failed due to a database trigger/policy error. " +
                "Please open Supabase Dashboard → Logs → Auth to see the exact Postgres error, " +
                "or send a screenshot of the Network response body from /auth/v1/signup.";
            } else if (errorMessage.includes("User already registered") || errorMessage.includes("already registered")) {
              errorMessage = "An account with this email already exists. Please sign in instead.";
            } else if (errorMessage.includes("Password") || errorMessage.includes("password")) {
              errorMessage = "Password does not meet requirements. Please use a stronger password.";
            } else if (errorMessage.includes("Email") || errorMessage.includes("email")) {
              errorMessage = "Invalid email address. Please check and try again.";
            }

            const debugSuffix =
              status || code ? ` (debug: status=${status ?? "?"}${code ? `, code=${code}` : ""})` : "";
            errorMessage = `${errorMessage}${debugSuffix}`;
            
            set({ error: errorMessage, isLoading: false });
            return { success: false, error: errorMessage };
          }

          const displayName = metadata?.username || email.split("@")[0];

          // Check if email confirmation is required
          if (data.user && !data.session) {
            // Send appropriate email based on returning status
            sendWelcomeEmail(email, displayName, isReturning);
            // Subscribe to newsletter (doesn't send newsletter email)
            subscribeToNewsletter(data.user.id, email);
            
            set({ isLoading: false });
            return { 
              success: true, 
              error: "Please check your email to confirm your account" 
            };
          }

          // Send appropriate email and subscribe to newsletter for immediate signup
          if (data.user) {
            sendWelcomeEmail(email, displayName, isReturning);
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

      // Email verification
      resendVerificationEmail: async () => {
        if (!isSupabaseConfigured()) {
          return { success: false, error: "Authentication is not configured" };
        }

        const { user } = get();
        if (!user?.email) {
          return { success: false, error: "No user email found" };
        }

        if (get().isEmailVerified) {
          return { success: false, error: "Email is already verified" };
        }

        set({ isResendingVerification: true });

        try {
          const { error } = await supabase.auth.resend({
            type: "signup",
            email: user.email,
            options: {
              emailRedirectTo: `${window.location.origin}/auth/callback`,
            },
          });

          if (error) {
            set({ isResendingVerification: false });
            return { success: false, error: error.message };
          }

          // Start cooldown (60 seconds)
          set({ isResendingVerification: false, verificationResendCooldown: 60 });
          
          // Countdown timer
          const interval = setInterval(() => {
            const current = get().verificationResendCooldown;
            if (current <= 1) {
              clearInterval(interval);
              set({ verificationResendCooldown: 0 });
            } else {
              set({ verificationResendCooldown: current - 1 });
            }
          }, 1000);

          return { success: true };
        } catch (error) {
          set({ isResendingVerification: false });
          const message = error instanceof Error ? error.message : "Failed to resend verification email";
          return { success: false, error: message };
        }
      },

      checkEmailVerification: async () => {
        if (!isSupabaseConfigured()) return false;

        const { user } = get();
        if (!user) return false;

        try {
          // Refresh the session to get latest user data
          const { data: { user: freshUser } } = await supabase.auth.getUser();
          
          if (freshUser?.email_confirmed_at) {
            set({ isEmailVerified: true });
            return true;
          }
          
          return false;
        } catch {
          return false;
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

