import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { User, Session } from "@supabase/supabase-js";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";

// Helper function to format user-friendly error messages
function formatUserFriendlyError(error: unknown, context: "signup" | "login" | "password" | "general" = "general"): string {
  const anyErr = error as { status?: number; code?: string; message?: string };
  const message = anyErr.message || "";
  const code = anyErr.code || "";
  const status = anyErr.status;

  // Log full error for debugging (but don't show to user)
  console.error(`[${context}] Error:`, error, { status, code });

  // Signup errors
  if (context === "signup") {
    if (code === "user_already_exists" || message.includes("already exists") || message.includes("already registered")) {
      return "An account with this email already exists. Please sign in instead.";
    }
    if (message.includes("Password") || message.includes("password") || code === "weak_password") {
      return "Password is too weak. Please use at least 6 characters with a mix of letters and numbers.";
    }
    if (message.includes("Email") || message.includes("email") || code === "invalid_email") {
      return "Please enter a valid email address.";
    }
    if (status === 500 || message.includes("Database error") || message.includes("Internal Server Error")) {
      return "We're experiencing technical difficulties. Please try again in a few moments.";
    }
    return "Unable to create your account. Please check your information and try again.";
  }

  // Login errors
  if (context === "login") {
    if (message.includes("Invalid login credentials") || message.includes("Invalid") || code === "invalid_credentials") {
      return "Incorrect email or password. Please check and try again.";
    }
    if (message.includes("Email not confirmed") || code === "email_not_confirmed") {
      return "Please check your email and click the confirmation link before signing in.";
    }
    if (message.includes("too many requests") || code === "too_many_requests") {
      return "Too many login attempts. Please wait a few minutes and try again.";
    }
    return "Unable to sign in. Please check your email and password.";
  }

  // Password errors
  if (context === "password") {
    if (message.includes("same") || message.includes("identical")) {
      return "New password must be different from your current password.";
    }
    if (message.includes("weak") || message.includes("Password")) {
      return "Password is too weak. Please use at least 6 characters.";
    }
    if (message.includes("expired") || code === "expired") {
      return "This password reset link has expired. Please request a new one.";
    }
    if (message.includes("invalid") || code === "invalid") {
      return "This password reset link is invalid. Please request a new one.";
    }
    return "Unable to reset password. Please try again or request a new reset link.";
  }

  // General errors
  return "Something went wrong. Please try again.";
}

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
            const errorMessage = formatUserFriendlyError(error, "login");
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

          // If this user has a referral code stored in metadata (from a referral signup),
          // process it now (auth triggers are disabled in production).
          const referralCode = (data.user.user_metadata as { referral_code?: string | null } | null)?.referral_code || null;
          if (referralCode && data.session?.access_token) {
            try {
              const resp = await fetch("/api/referrals/process", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${data.session.access_token}`,
                },
                body: JSON.stringify({ referralCode }),
              });
              if (!resp.ok) {
                const text = await resp.text().catch(() => "");
                console.warn("Referral processing failed:", resp.status, text);
              }
            } catch (e) {
              console.warn("Referral processing call failed:", e);
            }
          }

          return { success: true };
        } catch (error) {
          const errorMessage = formatUserFriendlyError(error, "login");
          set({ error: errorMessage, isLoading: false });
          return { success: false, error: errorMessage };
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
            const errorMessage = formatUserFriendlyError(error, "signup");
            set({ error: errorMessage, isLoading: false });
            return { success: false, error: errorMessage };
          }

          const displayName = metadata?.username || email.split("@")[0];

          // Process referral immediately (server-side) so it works even when auth triggers are disabled.
          // If email confirmation is required (no session), we'll process it on first login instead.
          if (data.user && metadata?.referralCode && data.session?.access_token) {
            try {
              const resp = await fetch("/api/referrals/process", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${data.session.access_token}`,
                },
                body: JSON.stringify({
                  referralCode: metadata.referralCode,
                }),
              });
              if (!resp.ok) {
                const text = await resp.text().catch(() => "");
                console.warn("Referral processing failed:", resp.status, text);
              }
            } catch (e) {
              // Best-effort; don't block signup
              console.warn("Referral processing call failed:", e);
            }
          }

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
          const errorMessage = formatUserFriendlyError(error, "signup");
          set({ error: errorMessage, isLoading: false });
          return { success: false, error: errorMessage };
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
            const errorMessage = formatUserFriendlyError(error, "password");
            set({ error: errorMessage, isLoading: false });
            return { success: false, error: errorMessage };
          }

          set({ isLoading: false });
          return { success: true };
        } catch (error) {
          const errorMessage = formatUserFriendlyError(error, "password");
          set({ error: errorMessage, isLoading: false });
          return { success: false, error: errorMessage };
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
            const errorMessage = formatUserFriendlyError(error, "password");
            set({ error: errorMessage, isLoading: false });
            return { success: false, error: errorMessage };
          }

          set({ isLoading: false });
          return { success: true };
        } catch (error) {
          const errorMessage = formatUserFriendlyError(error, "password");
          set({ error: errorMessage, isLoading: false });
          return { success: false, error: errorMessage };
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
            const errorMessage = formatUserFriendlyError(error, "login");
            return { success: false, error: errorMessage };
          }

          return { success: true };
        } catch (error) {
          const errorMessage = formatUserFriendlyError(error, "login");
          return { success: false, error: errorMessage };
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
            const errorMessage = formatUserFriendlyError(error, "login");
            return { success: false, error: errorMessage };
          }

          return { success: true };
        } catch (error) {
          const errorMessage = formatUserFriendlyError(error, "login");
          return { success: false, error: errorMessage };
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
            const errorMessage = formatUserFriendlyError(error, "general");
            return { success: false, error: errorMessage };
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
          console.error("Error resending verification email:", error);
          set({ isResendingVerification: false });
          return { success: false, error: "Unable to resend verification email. Please try again." };
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

