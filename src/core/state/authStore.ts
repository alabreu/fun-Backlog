import { create } from 'zustand'
import type { AuthUser } from '@core/domain/user'

/**
 * Estado de auth atual. `ready` vira true quando a sessão inicial resolve
 * (para a UI não piscar "deslogado" antes do Supabase restaurar a sessão).
 */
interface AuthState {
  user: AuthUser | null
  ready: boolean
  setUser: (user: AuthUser | null) => void
  setReady: (ready: boolean) => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  ready: false,
  setUser: (user) => set({ user }),
  setReady: (ready) => set({ ready }),
}))
