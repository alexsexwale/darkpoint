"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui";
import { useMultiplayerStore } from "@/stores";

interface GuestNicknameModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNicknameSet: (name: string) => void;
  title?: string;
  description?: string;
}

export function GuestNicknameModal({
  isOpen,
  onClose,
  onNicknameSet,
  title = "Enter Your Nickname",
  description = "Choose a name to play as a guest",
}: GuestNicknameModalProps) {
  const [nickname, setNickname] = useState("");
  const [error, setError] = useState("");
  const { createGuestPlayer } = useMultiplayerStore();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = nickname.trim();
    
    if (!trimmed) {
      setError("Please enter a nickname");
      return;
    }
    
    if (trimmed.length < 2) {
      setError("Nickname must be at least 2 characters");
      return;
    }
    
    if (trimmed.length > 20) {
      setError("Nickname must be 20 characters or less");
      return;
    }

    // Create guest player in store
    const guest = createGuestPlayer(trimmed);
    onNicknameSet(guest.name);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-[var(--color-dark-2)] border border-[var(--color-dark-3)] rounded-xl p-6 max-w-md w-full"
          >
            <div className="text-center mb-6">
              <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-[var(--color-main-1)] to-purple-600 rounded-full flex items-center justify-center">
                <span className="text-3xl">👤</span>
              </div>
              <h2 className="text-xl font-heading">{title}</h2>
              <p className="text-sm text-[var(--muted-foreground)] mt-1">{description}</p>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <input
                  type="text"
                  value={nickname}
                  onChange={(e) => {
                    setNickname(e.target.value);
                    setError("");
                  }}
                  placeholder="Your nickname"
                  className="w-full px-4 py-3 bg-[var(--color-dark-3)] border border-[var(--color-dark-4)] rounded-lg text-white placeholder-[var(--muted-foreground)] focus:outline-none focus:border-[var(--color-main-1)]"
                  maxLength={20}
                  autoFocus
                />
                {error && (
                  <p className="text-red-400 text-sm mt-2">{error}</p>
                )}
              </div>

              <Button
                type="submit"
                variant="primary"
                className="w-full"
                disabled={!nickname.trim()}
              >
                Continue as Guest
              </Button>
            </form>

            <div className="mt-4 text-center">
              <p className="text-xs text-[var(--muted-foreground)] mb-2">
                Want to save your progress?
              </p>
              <button
                onClick={onClose}
                className="text-sm text-[var(--color-main-1)] hover:underline"
              >
                Log in or Sign up
              </button>
            </div>

            <button
              className="absolute top-4 right-4 text-[var(--muted-foreground)] hover:text-white transition-colors"
              onClick={onClose}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Hook for managing guest state
export function useGuestPlayer() {
  const { guestPlayer, getPlayerId, getPlayerName, isGuest } = useMultiplayerStore();
  
  return {
    guestPlayer,
    getPlayerId,
    getPlayerName,
    isGuest,
    needsNickname: (authUserId: string | null) => !authUserId && !guestPlayer,
  };
}
