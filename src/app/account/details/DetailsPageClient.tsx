"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { AccountLayout } from "@/components/account";
import { Button, PhoneInput, formatPhoneForDisplay } from "@/components/ui";
import { useAuthStore, useGamificationStore, useAccountStore } from "@/stores";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";

export function DetailsPageClient() {
  const router = useRouter();
  const { user, signOut } = useAuthStore();
  const { userProfile, fetchUserProfile } = useGamificationStore();
  const { updateProfile, updatePassword } = useAccountStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    displayName: "",
    username: "",
    email: "",
    phone: "",
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
  
  // Account deletion state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteReason, setDeleteReason] = useState("");
  const [confirmEmail, setConfirmEmail] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

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
        phone: userProfile?.phone || metadata.phone || "",
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

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setAvatarMessage({ type: "error", text: "Image must be less than 10MB" });
      return;
    }

    setIsUploadingAvatar(true);
    setAvatarMessage(null);

    try {
      if (!isSupabaseConfigured()) {
        throw new Error("Storage not configured");
      }

      // Create unique filename - store in Assets bucket under avatars folder
      const fileExt = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const fileName = `${user.id}-${Date.now()}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      // Delete old avatar if it exists in storage
      if (avatarUrl && avatarUrl.includes("/storage/") && avatarUrl.includes("/Assets/")) {
        try {
          const oldPath = avatarUrl.split("/Assets/")[1];
          if (oldPath) {
            await supabase.storage.from("Assets").remove([oldPath]);
          }
        } catch {
          // Ignore errors when deleting old avatar
        }
      }

      // Upload to Supabase Storage (Assets bucket)
      const { error: uploadError } = await supabase.storage
        .from("Assets")
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: true,
        });

      if (uploadError) {
        console.error("Storage upload error:", uploadError);
        setAvatarMessage({ 
          type: "error", 
          text: `Upload failed: ${uploadError.message}. Make sure Storage policies allow uploads.` 
        });
        setIsUploadingAvatar(false);
        return;
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from("Assets")
        .getPublicUrl(filePath);

      // Update user profile with avatar URL
      const result = await updateProfile({ avatar_url: publicUrl });
      
      if (result.success) {
        setAvatarUrl(publicUrl);
        setAvatarMessage({ type: "success", text: "Profile picture updated!" });
        // Note: Don't call fetchUserProfile() here as it may overwrite the avatar 
        // before the DB update propagates. The URL is already set locally.
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
        phone: formData.phone || null,
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
              JPG, PNG or GIF. Max 10MB.
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

        {/* Phone Number */}
        <div>
          <label className="block text-sm text-white/70 mb-2">
            Phone number
          </label>
          <PhoneInput
            name="phone"
            value={formData.phone}
            onChange={(rawPhone) => {
              setFormData((prev) => ({ ...prev, phone: rawPhone }));
              setMessage(null);
            }}
            placeholder="(072) 123 1234"
          />
          <p className="text-xs text-white/50 mt-1">
            Used for order updates and delivery notifications
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

      {/* Delete Account Section */}
      <div className="max-w-xl mt-12 pt-8 border-t border-red-500/30">
        <h3 className="font-heading text-xl mb-4 text-red-400">⚠️ Danger Zone</h3>
        
        <div className="bg-red-500/5 border border-red-500/20 p-6 rounded">
          <h4 className="font-heading text-lg mb-2">Delete Account</h4>
          <p className="text-white/60 text-sm mb-4">
            Once you delete your account, there is no going back. Please be certain.
          </p>
          
          <div className="space-y-2 text-sm text-white/50 mb-6">
            <p className="flex items-start gap-2">
              <span className="text-red-400">•</span>
              All your XP ({userProfile?.total_xp || 0} XP) will be permanently lost
            </p>
            <p className="flex items-start gap-2">
              <span className="text-red-400">•</span>
              All achievements and progress will be deleted
            </p>
            <p className="flex items-start gap-2">
              <span className="text-red-400">•</span>
              All rewards, discounts, and free deliveries will be removed
            </p>
            <p className="flex items-start gap-2">
              <span className="text-red-400">•</span>
              Your referral code will become invalid
            </p>
            <p className="flex items-start gap-2">
              <span className="text-red-400">•</span>
              If you have existing orders, they will be anonymized for our records
            </p>
            <p className="flex items-start gap-2">
              <span className="text-yellow-400">•</span>
              <span className="text-yellow-400/80">If you create a new account with the same email, you will NOT receive welcome bonuses</span>
            </p>
          </div>
          
          <button
            type="button"
            onClick={() => setShowDeleteModal(true)}
            className="px-4 py-2 bg-transparent border border-red-500/50 text-red-400 hover:bg-red-500/10 hover:border-red-500 transition-colors cursor-pointer"
          >
            Delete My Account
          </button>
        </div>
      </div>

      {/* Delete Account Modal */}
      <AnimatePresence>
        {showDeleteModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80"
            onClick={() => !isDeleting && setShowDeleteModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md bg-[var(--color-dark-2)] border border-red-500/30 p-6 rounded-lg"
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-red-500/20 rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-heading text-xl text-red-400">Delete Account</h3>
                  <p className="text-sm text-white/50">This action cannot be undone</p>
                </div>
              </div>

              {deleteError && (
                <div className="p-3 mb-4 bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded">
                  {deleteError}
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-white/70 mb-2">
                    Why are you leaving? (optional)
                  </label>
                  <select
                    value={deleteReason}
                    onChange={(e) => setDeleteReason(e.target.value)}
                    disabled={isDeleting}
                    className="w-full px-4 py-3 bg-[var(--color-dark-3)] border border-[var(--color-dark-4)] text-white focus:border-red-500/50 focus:outline-none transition-colors"
                  >
                    <option value="">Select a reason...</option>
                    <option value="no_longer_needed">No longer need the service</option>
                    <option value="privacy_concerns">Privacy concerns</option>
                    <option value="too_many_emails">Too many emails</option>
                    <option value="found_alternative">Found an alternative</option>
                    <option value="difficult_to_use">Too difficult to use</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm text-white/70 mb-2">
                    Type your email to confirm: <span className="text-white font-mono">{user?.email}</span>
                  </label>
                  <input
                    type="email"
                    value={confirmEmail}
                    onChange={(e) => {
                      setConfirmEmail(e.target.value);
                      setDeleteError(null);
                    }}
                    disabled={isDeleting}
                    placeholder="Enter your email"
                    className="w-full px-4 py-3 bg-[var(--color-dark-3)] border border-[var(--color-dark-4)] text-white placeholder-white/30 focus:border-red-500/50 focus:outline-none transition-colors"
                  />
                </div>

                <div className="bg-yellow-500/10 border border-yellow-500/30 p-4 rounded text-sm">
                  <p className="text-yellow-400 font-medium mb-2">⚠️ Final Warning</p>
                  <p className="text-yellow-400/70">
                    You will lose <strong>{userProfile?.total_xp || 0} XP</strong>, all your achievements, 
                    rewards, and progress. If you sign up again with the same email, you will 
                    NOT receive any welcome bonuses.
                  </p>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowDeleteModal(false);
                    setConfirmEmail("");
                    setDeleteReason("");
                    setDeleteError(null);
                  }}
                  disabled={isDeleting}
                  className="flex-1 px-4 py-3 bg-[var(--color-dark-3)] hover:bg-[var(--color-dark-4)] text-white transition-colors cursor-pointer disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    if (confirmEmail.toLowerCase() !== user?.email?.toLowerCase()) {
                      setDeleteError("Email does not match. Please type your email correctly.");
                      return;
                    }

                    setIsDeleting(true);
                    setDeleteError(null);

                    try {
                      const { data: { session } } = await supabase.auth.getSession();
                      if (!session?.access_token) {
                        throw new Error("Not authenticated");
                      }

                      const response = await fetch("/api/account/delete", {
                        method: "POST",
                        headers: {
                          "Content-Type": "application/json",
                          Authorization: `Bearer ${session.access_token}`,
                        },
                        body: JSON.stringify({
                          reason: deleteReason,
                          confirmEmail: confirmEmail,
                        }),
                      });

                      const result = await response.json();

                      if (!response.ok || !result.success) {
                        throw new Error(result.error || "Failed to delete account");
                      }

                      // Sign out and redirect
                      await signOut();
                      router.push("/?deleted=true");
                    } catch (err) {
                      setDeleteError(err instanceof Error ? err.message : "Failed to delete account");
                      setIsDeleting(false);
                    }
                  }}
                  disabled={isDeleting || !confirmEmail}
                  className="flex-1 px-4 py-3 bg-red-500 hover:bg-red-600 text-white font-medium transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isDeleting ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Deleting...
                    </span>
                  ) : (
                    "Delete My Account"
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </AccountLayout>
  );
}
