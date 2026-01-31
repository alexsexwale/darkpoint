import { create } from "zustand";
import { persist } from "zustand/middleware";
import { GameType } from "@/types/database";
import { GuestPlayer } from "@/lib/cardGames/multiplayer/types";

interface MultiplayerState {
  // Guest player info (for non-authenticated users)
  guestPlayer: GuestPlayer | null;
  
  // Current room info (for quick access without fetching)
  currentRoomCode: string | null;
  currentRoomGameType: GameType | null;
  
  // Actions
  setGuestPlayer: (player: GuestPlayer | null) => void;
  createGuestPlayer: (name: string) => GuestPlayer;
  setCurrentRoom: (code: string | null, gameType: GameType | null) => void;
  clearCurrentRoom: () => void;
  
  // Getters
  getPlayerId: (authUserId: string | null) => string;
  getPlayerName: (authUserName: string | null) => string;
  isGuest: (authUserId: string | null) => boolean;
}

// Generate a unique guest ID
function generateGuestId(): string {
  return `guest_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

export const useMultiplayerStore = create<MultiplayerState>()(
  persist(
    (set, get) => ({
      guestPlayer: null,
      currentRoomCode: null,
      currentRoomGameType: null,

      setGuestPlayer: (player) => set({ guestPlayer: player }),

      createGuestPlayer: (name) => {
        const player: GuestPlayer = {
          id: generateGuestId(),
          name,
          createdAt: new Date().toISOString(),
        };
        set({ guestPlayer: player });
        return player;
      },

      setCurrentRoom: (code, gameType) =>
        set({ currentRoomCode: code, currentRoomGameType: gameType }),

      clearCurrentRoom: () =>
        set({ currentRoomCode: null, currentRoomGameType: null }),

      getPlayerId: (authUserId) => {
        if (authUserId) return authUserId;
        const guest = get().guestPlayer;
        return guest?.id || "";
      },

      getPlayerName: (authUserName) => {
        if (authUserName) return authUserName;
        const guest = get().guestPlayer;
        return guest?.name || "Guest";
      },

      isGuest: (authUserId) => !authUserId,
    }),
    {
      name: "multiplayer-storage",
      partialize: (state) => ({
        guestPlayer: state.guestPlayer,
      }),
    }
  )
);
