import { useEffect } from 'react'
import { authClient } from '@core/auth/client'
import { useAuthStore } from '@core/state/authStore'

let started = false

/**
 * Inicializa o auth uma vez no boot do app: restaura a sessão e assina as
 * mudanças. Chamar no shell do app (App.tsx).
 */
export function useAuthInit(): void {
  const setUser = useAuthStore((s) => s.setUser)
  const setReady = useAuthStore((s) => s.setReady)

  useEffect(() => {
    if (started) return
    started = true
    if (!authClient.configured) {
      setReady(true)
      return
    }
    authClient.currentUser().then((user) => {
      setUser(user)
      setReady(true)
    })
    const unsub = authClient.onChange((user) => setUser(user))
    return () => unsub()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
}

/** Acesso ao estado de auth + ações. */
export function useAuth() {
  const user = useAuthStore((s) => s.user)
  const ready = useAuthStore((s) => s.ready)
  return {
    user,
    ready,
    configured: authClient.configured,
    signIn: authClient.signIn,
    signUp: authClient.signUp,
    signInWithGoogle: () => authClient.signInWithGoogle(window.location.origin),
    signOut: authClient.signOut,
  }
}
