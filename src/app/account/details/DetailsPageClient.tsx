"use client";

import { useState, useEffect } from "react";
import { AccountLayout } from "@/components/account";
import { Button } from "@/components/ui";
import { useAuthStore, useGamificationStore, useAccountStore } from "@/stores";

export function DetailsPageClient() {
  const { user } = useAuthStore();
  const { userProfile, fetchUserProfile } = useGamificationStore();
  const { updateProfile, updatePassword } = useAccountStore();

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    displayName: "",
    username: "",
    email: "",
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [passwordMessage, setPasswordMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Load user data on mount
  useEffect(() => {
    if (user) {
      const metadata = user.user_metadata || {};
      const nameParts = (metadata.full_name || "").split(" ");
      
      setFormData({
        firstName: metadata.firstName || nameParts[0] || "",
        lastName: metadata.lastName || nameParts.slice(1).join(" ") || "",
        displayName: userProfile?.display_name || metadata.full_name || "",
        username: userProfile?.username || "",
        email: user.email || "",
      });
    }
  }, [user, userProfile]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setMessage(null);
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPasswordData((prev) => ({ ...prev, [name]: value }));
    setPasswordMessage(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setMessage(null);

    try {
      const result = await updateProfile({
        display_name: formData.displayName || `${formData.firstName} ${formData.lastName}`.trim(),
        username: formData.username.toLowerCase().replace(/[^a-z0-9_]/g, ""),
      });

      if (result.success) {
        setMessage({ type: "success", text: "Profile updated successfully!" });
        // Refresh profile data
        await fetchUserProfile();
      } else {
        setMessage({ type: "error", text: result.error || "Failed to update profile" });
      }
    } catch {
      setMessage({ type: "error", text: "An unexpected error occurred" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!passwordData.newPassword) {
      setPasswordMessage({ type: "error", text: "Please enter a new password" });
      return;
    }

    if (passwordData.newPassword.length < 6) {
      setPasswordMessage({ type: "error", text: "Password must be at least 6 characters" });
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordMessage({ type: "error", text: "Passwords do not match" });
      return;
    }

    setIsChangingPassword(true);
    setPasswordMessage(null);

    try {
      const result = await updatePassword(passwordData.currentPassword, passwordData.newPassword);

      if (result.success) {
        setPasswordMessage({ type: "success", text: "Password updated successfully!" });
        setPasswordData({ currentPassword: "", newPassword: "", confirmPassword: "" });
      } else {
        setPasswordMessage({ type: "error", text: result.error || "Failed to update password" });
      }
    } catch {
      setPasswordMessage({ type: "error", text: "An unexpected error occurred" });
    } finally {
      setIsChangingPassword(false);
    }
  };

  return (
    <AccountLayout title="Account Details">
      <form onSubmit={handleSubmit} className="max-w-xl space-y-6">
        {/* Success/Error Message */}
        {message && (
          <div
            className={`p-4 rounded ${
              message.type === "success"
                ? "bg-green-500/10 border border-green-500/30 text-green-400"
                : "bg-red-500/10 border border-red-500/30 text-red-400"
            }`}
          >
            {message.text}
          </div>
        )}

        {/* Username */}
        <div>
          <label className="block text-sm text-white/70 mb-2">
            Username <span className="text-[var(--color-main-1)]">*</span>
          </label>
          <input
            type="text"
            name="username"
            value={formData.username}
            onChange={(e) => {
              const value = e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "");
              setFormData((prev) => ({ ...prev, username: value }));
              setMessage(null);
            }}
            required
            minLength={3}
            maxLength={30}
            className="w-full px-4 py-3 bg-[var(--color-dark-3)] border border-[var(--color-dark-4)] text-white placeholder-[var(--muted-foreground)] focus:border-[var(--color-main-1)] focus:outline-none transition-colors"
          />
          <p className="text-xs text-white/50 mt-1">
            Only lowercase letters, numbers, and underscores. Used for login and profile URL.
          </p>
        </div>

        {/* Name Fields */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-white/70 mb-2">
              First name <span className="text-[var(--color-main-1)]">*</span>
            </label>
            <input
              type="text"
              name="firstName"
              value={formData.firstName}
              onChange={handleChange}
              required
              className="w-full px-4 py-3 bg-[var(--color-dark-3)] border border-[var(--color-dark-4)] text-white placeholder-[var(--muted-foreground)] focus:border-[var(--color-main-1)] focus:outline-none transition-colors"
            />
          </div>
          <div>
            <label className="block text-sm text-white/70 mb-2">
              Last name <span className="text-[var(--color-main-1)]">*</span>
            </label>
            <input
              type="text"
              name="lastName"
              value={formData.lastName}
              onChange={handleChange}
              required
              className="w-full px-4 py-3 bg-[var(--color-dark-3)] border border-[var(--color-dark-4)] text-white placeholder-[var(--muted-foreground)] focus:border-[var(--color-main-1)] focus:outline-none transition-colors"
            />
          </div>
        </div>

        {/* Display Name */}
        <div>
          <label className="block text-sm text-white/70 mb-2">
            Display name <span className="text-[var(--color-main-1)]">*</span>
          </label>
          <input
            type="text"
            name="displayName"
            value={formData.displayName}
            onChange={handleChange}
            required
            className="w-full px-4 py-3 bg-[var(--color-dark-3)] border border-[var(--color-dark-4)] text-white placeholder-[var(--muted-foreground)] focus:border-[var(--color-main-1)] focus:outline-none transition-colors"
          />
          <p className="text-xs text-white/50 mt-1">
            This will be how your name will be displayed in the account section
            and in reviews
          </p>
        </div>

        {/* Email (read-only) */}
        <div>
          <label className="block text-sm text-white/70 mb-2">
            Email address <span className="text-[var(--color-main-1)]">*</span>
          </label>
          <input
            type="email"
            name="email"
            value={formData.email}
            disabled
            className="w-full px-4 py-3 bg-[var(--color-dark-4)] border border-[var(--color-dark-4)] text-white/60 cursor-not-allowed"
          />
          <p className="text-xs text-white/50 mt-1">
            Contact support to change your email address
          </p>
        </div>

        {/* Submit Button */}
        <div className="pt-4">
          <Button variant="primary" type="submit" disabled={isSubmitting}>
            {isSubmitting ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Saving...
              </span>
            ) : (
              "Save Changes"
            )}
          </Button>
        </div>
      </form>

      {/* Password Change Section */}
      <form onSubmit={handlePasswordSubmit} className="max-w-xl mt-8 pt-8 border-t border-white/10">
        <h3 className="font-heading text-xl mb-6">Password Change</h3>

        {/* Password Success/Error Message */}
        {passwordMessage && (
          <div
            className={`p-4 rounded mb-6 ${
              passwordMessage.type === "success"
                ? "bg-green-500/10 border border-green-500/30 text-green-400"
                : "bg-red-500/10 border border-red-500/30 text-red-400"
            }`}
          >
            {passwordMessage.text}
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-sm text-white/70 mb-2">
              Current password (leave blank to leave unchanged)
            </label>
            <input
              type="password"
              name="currentPassword"
              value={passwordData.currentPassword}
              onChange={handlePasswordChange}
              className="w-full px-4 py-3 bg-[var(--color-dark-3)] border border-[var(--color-dark-4)] text-white placeholder-[var(--muted-foreground)] focus:border-[var(--color-main-1)] focus:outline-none transition-colors"
            />
          </div>

          <div>
            <label className="block text-sm text-white/70 mb-2">
              New password (leave blank to leave unchanged)
            </label>
            <input
              type="password"
              name="newPassword"
              value={passwordData.newPassword}
              onChange={handlePasswordChange}
              minLength={6}
              className="w-full px-4 py-3 bg-[var(--color-dark-3)] border border-[var(--color-dark-4)] text-white placeholder-[var(--muted-foreground)] focus:border-[var(--color-main-1)] focus:outline-none transition-colors"
            />
          </div>

          <div>
            <label className="block text-sm text-white/70 mb-2">
              Confirm new password
            </label>
            <input
              type="password"
              name="confirmPassword"
              value={passwordData.confirmPassword}
              onChange={handlePasswordChange}
              className="w-full px-4 py-3 bg-[var(--color-dark-3)] border border-[var(--color-dark-4)] text-white placeholder-[var(--muted-foreground)] focus:border-[var(--color-main-1)] focus:outline-none transition-colors"
            />
          </div>
        </div>

        <div className="pt-6">
          <Button 
            variant="outline" 
            type="submit" 
            disabled={isChangingPassword || (!passwordData.newPassword && !passwordData.confirmPassword)}
          >
            {isChangingPassword ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Updating...
              </span>
            ) : (
              "Change Password"
            )}
          </Button>
        </div>
      </form>
    </AccountLayout>
  );
}
