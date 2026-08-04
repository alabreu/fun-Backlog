import { useState } from 'react'
import { GoogleLogo, SignOut } from '@phosphor-icons/react'
import { useNavigate } from 'react-router-dom'
import { ScreenHeader } from '@ui/components/ScreenHeader'
import { useAuth } from '@ui/hooks/useAuth'
import { useTranslation } from '@ui/hooks/useTranslation'

/**
 * Login real: email + senha (entrar / criar conta) e Google OAuth. Opcional —
 * o app funciona por completo como convidado; sem backend configurado mostra um
 * aviso amigável, e já logado mostra a conta + sair.
 */
export function LoginScreen() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { user, configured, signIn, signUp, signInWithGoogle, signOut } =
    useAuth()

  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(false)
  const [busy, setBusy] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (busy || !email || !password) return
    setBusy(true)
    setError(false)
    try {
      if (mode === 'signup') await signUp(email, password)
      else await signIn(email, password)
      navigate('/')
    } catch {
      setError(true)
    } finally {
      setBusy(false)
    }
  }

  async function google() {
    setError(false)
    try {
      await signInWithGoogle()
    } catch {
      setError(true)
    }
  }

  return (
    <div className="flex h-full flex-col">
      <ScreenHeader title={t('auth.title')} />

      <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-8">
        {!configured ? (
          <p className="mt-10 text-center text-sm text-muted">
            {t('auth.soon')}
          </p>
        ) : user ? (
          <div className="mt-6 flex flex-col items-center gap-4 text-center">
            {user.avatarUrl && (
              <img
                src={user.avatarUrl}
                alt=""
                className="h-16 w-16 rounded-full object-cover ring-1 ring-ink/10"
              />
            )}
            <div>
              <p className="text-xs uppercase tracking-wide text-muted">
                {t('auth.signedInAs')}
              </p>
              <p className="text-lg font-bold">{user.name ?? user.email}</p>
              {user.name && user.email && (
                <p className="text-sm text-muted">{user.email}</p>
              )}
            </div>
            <button
              type="button"
              onClick={() => signOut()}
              className="mt-2 flex items-center gap-2 rounded-full bg-surface px-5 py-3 text-sm font-semibold text-ink ring-1 ring-ink/10 transition active:scale-95"
            >
              <SignOut size={18} weight="bold" />
              {t('auth.signOut')}
            </button>
          </div>
        ) : (
          <>
            <p className="mb-5 mt-1 text-sm text-muted">{t('auth.subtitle')}</p>

            <button
              type="button"
              onClick={google}
              className="flex w-full items-center justify-center gap-2 rounded-full bg-surface py-3.5 text-sm font-semibold text-ink ring-1 ring-ink/15 transition active:scale-95"
            >
              <GoogleLogo size={20} weight="bold" />
              {t('auth.google')}
            </button>

            <div className="my-5 flex items-center gap-3 text-xs text-muted">
              <span className="h-px flex-1 bg-ink/10" />
              {t('auth.or')}
              <span className="h-px flex-1 bg-ink/10" />
            </div>

            <form onSubmit={submit} className="flex flex-col gap-3">
              <input
                type="email"
                autoComplete="email"
                aria-label={t('auth.email')}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t('auth.email')}
                className="w-full rounded-2xl bg-ink/5 px-4 py-3 text-sm text-ink outline-none ring-1 ring-ink/10 placeholder:text-muted focus:ring-2 focus:ring-primary/40"
              />
              <input
                type="password"
                autoComplete={
                  mode === 'signup' ? 'new-password' : 'current-password'
                }
                aria-label={t('auth.password')}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t('auth.password')}
                className="w-full rounded-2xl bg-ink/5 px-4 py-3 text-sm text-ink outline-none ring-1 ring-ink/10 placeholder:text-muted focus:ring-2 focus:ring-primary/40"
              />

              {error && <p className="text-sm text-danger">{t('auth.error')}</p>}

              <button
                type="submit"
                disabled={busy || !email || !password}
                className="mt-1 rounded-full bg-primary py-3.5 text-sm font-semibold text-white transition active:scale-95 disabled:opacity-40 disabled:active:scale-100"
              >
                {mode === 'signup' ? t('auth.signUp') : t('auth.signIn')}
              </button>
            </form>

            <button
              type="button"
              onClick={() => {
                setMode(mode === 'signin' ? 'signup' : 'signin')
                setError(false)
              }}
              className="mt-4 w-full text-center text-sm font-medium text-primary"
            >
              {mode === 'signin' ? t('auth.toSignUp') : t('auth.toSignIn')}
            </button>

            <p className="mt-6 text-center text-xs text-muted">
              {t('auth.guestNote')}
            </p>
          </>
        )}
      </div>
    </div>
  )
}
