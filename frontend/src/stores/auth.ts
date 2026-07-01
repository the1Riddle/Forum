import { create } from "zustand";
import type { User } from "@/types";
import { wsManager } from "@/services/websocket";

interface AuthState {
  user: User | null;
  isAuthed: boolean;
  signIn: (u: User) => void;
  signOut: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthed: false,
  signIn: (u) => {
    wsManager.disconnect();
    set({ user: u, isAuthed: true });
  },
  signOut: () => {
    wsManager.disconnect();
    set({ user: null, isAuthed: false });
  },
}));
