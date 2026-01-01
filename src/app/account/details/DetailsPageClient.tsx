"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { AccountLayout } from "@/components/account";
import { Button } from "@/components/ui";
import { useAuthStore, useGamificationStore, useAccountStore } from "@/stores";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";

export function DetailsPageClient() {
  const { user } = useAuthStore();
  const { userProfile, fetchUserProfile } = useGamificationStore();
  const { updateProfile, updatePassword } = useAccountStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [passwordMessage, setPasswordMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [avatarMessage, setAvatarMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

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

      // Set avatar URL from profile or metadata
      setAvatarUrl(
        userProfile?.avatar_url || 
        metadata.avatar_url || 
        metadata.picture || 
        null
      );
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

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      setAvatarMessage({ type: "error", text: "Please select an image file" });
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      setAvatarMessage({ type: "error", text: "Image must be less than 2MB" });
      return;
    }

    setIsUploadingAvatar(true);
    setAvatarMessage(null);

    try {
      if (!isSupabaseConfigured()) {
        throw new Error("Storage not configured");
      }

      // Create unique filename
      const fileExt = file.name.split(".").pop();
      const fileName = `${user.id}-${Date.now()}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: true,
        });

      if (uploadError) {
        // If bucket doesn't exist, create it
        if (uploadError.message.includes("not found")) {
          // Try direct URL instead
          const reader = new FileReader();
          reader.onloadend = async () => {
            const base64 = reader.result as string;
            
            // Update profile with base64 (fallback)
            const result = await updateProfile({ avatar_url: base64 });
            
            if (result.success) {
              setAvatarUrl(base64);
              setAvatarMessage({ type: "success", text: "Profile picture updated!" });
              await fetchUserProfile();
            } else {
              throw new Error(result.error || "Failed to update avatar");
            }
          };
          reader.readAsDataURL(file);
          return;
        }
        throw uploadError;
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from("avatars")
        .getPublicUrl(filePath);

      // Update user profile with avatar URL
      const result = await updateProfile({ avatar_url: publicUrl });
      
      if (result.success) {
        setAvatarUrl(publicUrl);
        setAvatarMessage({ type: "success", text: "Profile picture updated!" });
        await fetchUserProfile();
      } else {
        throw new Error(result.error || "Failed to update profile");
      }
    } catch (error) {
      console.error("Avatar upload error:", error);
      setAvatarMessage({ 
        type: "error", 
        text: error instanceof Error ? error.message : "Failed to upload image" 
      });
    } finally {
      setIsUploadingAvatar(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleRemoveAvatar = async () => {
    if (!user) return;
    
    setIsUploadingAvatar(true);
    setAvatarMessage(null);

    try {
      const result = await updateProfile({ avatar_url: null });
      
      if (result.success) {
        setAvatarUrl(null);
        setAvatarMessage({ type: "success", text: "Profile picture removed!" });
        await fetchUserProfile();
      } else {
        throw new Error(result.error || "Failed to remove avatar");
      }
    } catch (error) {
      setAvatarMessage({ 
        type: "error", 
        text: error instanceof Error ? error.message : "Failed to remove image" 
      });
    } finally {
      setIsUploadingAvatar(false);
    }
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

  // Get initials for avatar fallback
  const getInitials = () => {
    const first = formData.firstName?.[0] || formData.displayName?.[0] || "";
    const last = formData.lastName?.[0] || "";
    return (first + last).toUpperCase() || "?";
  };

  return (
    <AccountLayout title="Account Details">
      {/* Profile Picture Section */}
      <div className="max-w-xl mb-8 pb-8 border-b border-white/10">
        <h3 className="font-heading text-xl mb-6">Profile Picture</h3>
        
        {avatarMessage && (
          <div
            className={`p-4 rounded mb-4 ${
              avatarMessage.type === "success"
                ? "bg-green-500/10 border border-green-500/30 text-green-400"
                : "bg-red-500/10 border border-red-500/30 text-red-400"
            }`}
          >
            {avatarMessage.text}
          </div>
        )}

        <div className="flex items-center gap-6">
          {/* Avatar Preview */}
          <div 
            onClick={handleAvatarClick}
            className="relative w-24 h-24 rounded-full overflow-hidden bg-[var(--color-dark-3)] border-2 border-[var(--color-dark-4)] hover:border-[var(--color-main-1)] transition-colors cursor-pointer group"
          >
            {avatarUrl ? (
              <Image
                src={avatarUrl}
                alt="Profile"
                fill
                className="object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-2xl font-heading text-white/60">
                {getInitials()}
              </div>
            )}
            
            {/* Overlay on hover */}
            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              {isUploadingAvatar ? (
                <svg className="animate-spin w-6 h-6 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              ) : (
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              )}
            </div>
          </div>

          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleAvatarChange}
            className="hidden"
          />

          {/* Actions */}
          <div className="space-y-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleAvatarClick}
              disabled={isUploadingAvatar}
            >
              {isUploadingAvatar ? "Uploading..." : "Upload Photo"}
            </Button>
            {avatarUrl && (
              <button
                onClick={handleRemoveAvatar}
                disabled={isUploadingAvatar}
                className="block text-sm text-red-400 hover:text-red-300 transition-colors"
              >
                Remove Photo
              </button>
            )}
            <p className="text-xs text-white/50">
              JPG, PNG or GIF. Max 2MB.
            </p>
          </div>
        </div>
      </div>

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
