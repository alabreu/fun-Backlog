import { useState } from 'react'
import { GoogleLogo, SignOut } from '@phosphor-icons/react'
import { useNavigate } from 'react-router'
import { Button, Input, Screen, ScreenBody } from '@ui/design'
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
    <Screen>
      <ScreenHeader title={t('auth.title')} />

      <ScreenBody>
        {!configured ? (
          <p className="mt-10 text-center text-body text-muted">
            {t('auth.soon')}
          </p>
        ) : user ? (
          <div className="mt-6 flex flex-col items-center gap-4 text-center">
            {user.avatarUrl && (
              <img
                src={user.avatarUrl}
                alt=""
                className="h-16 w-16 rounded-control object-cover ring-1 ring-ink/10"
              />
            )}
            <div>
              <p className="text-label uppercase tracking-wide text-muted">
                {t('auth.signedInAs')}
              </p>
              <p className="text-title font-bold">{user.name ?? user.email}</p>
              {user.name && user.email && (
                <p className="text-body text-muted">{user.email}</p>
              )}
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => signOut()}
              className="mt-2"
            >
              <SignOut size={18} weight="bold" />
              {t('auth.signOut')}
            </Button>
          </div>
        ) : (
          <>
            <p className="mb-5 mt-1 text-body text-muted">{t('auth.subtitle')}</p>

            <Button variant="secondary" fullWidth onClick={google}>
              <GoogleLogo size={20} weight="bold" />
              {t('auth.google')}
            </Button>

            <div className="my-5 flex items-center gap-3 text-label text-muted">
              <span className="h-px flex-1 bg-ink/10" />
              {t('auth.or')}
              <span className="h-px flex-1 bg-ink/10" />
            </div>

            <form onSubmit={submit} className="flex flex-col gap-3">
              <Input
                type="email"
                autoComplete="email"
                aria-label={t('auth.email')}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t('auth.email')}
              />
              <Input
                type="password"
                autoComplete={
                  mode === 'signup' ? 'new-password' : 'current-password'
                }
                aria-label={t('auth.password')}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t('auth.password')}
              />

              {error && (
                <p className="text-body text-danger">{t('auth.error')}</p>
              )}

              <Button
                type="submit"
                fullWidth
                disabled={busy || !email || !password}
                className="mt-1"
              >
                {mode === 'signup' ? t('auth.signUp') : t('auth.signIn')}
              </Button>
            </form>

            <Button
              variant="ghost"
              fullWidth
              onClick={() => {
                setMode(mode === 'signin' ? 'signup' : 'signin')
                setError(false)
              }}
              className="mt-4"
            >
              {mode === 'signin' ? t('auth.toSignUp') : t('auth.toSignIn')}
            </Button>

            <p className="mt-6 text-center text-label text-muted">
              {t('auth.guestNote')}
            </p>
          </>
        )}
      </ScreenBody>
    </Screen>
  )
}
