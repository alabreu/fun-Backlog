import { createClient, type SupabaseClient } from '@supabase/supabase-js'

/**
 * A COSTURA do backend. Toda chamada ao backend hospedado (hoje: Supabase)
 * passa por este módulo — auth, dados, feedback. Manter o provedor atrás deste
 * único arquivo é o que torna uma migração futura (ex.: AWS — Cognito + RDS +
 * Lambda) uma reescrita delimitada, em vez de uma caça pelo app inteiro.
 *
 * Opcional por design: sem as variáveis de ambiente o app roda 100% local
 * (modo convidado), sem mudança de comportamento.
 */
const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

/** Se o backend está configurado neste build (login/nuvem disponíveis). */
export const backendConfigured = Boolean(url && anonKey)

/** URL base do backend — para quem precisa chamar endpoints fora do SDK
 *  (ex.: Edge Functions). Continua passando por esta costura de propósito. */
export const backendUrl = url ?? ''

/** Chave pública (anon) — exigida como header `apikey` pelas Edge Functions. */
export const backendAnonKey = anonKey ?? ''

/** Cliente compartilhado (ou null quando não configurado) — sessão única para auth e dados. */
export const supabase: SupabaseClient | null = backendConfigured
  ? createClient(url as string, anonKey as string, {
      // PKCE: o código de autorização do OAuth/email só vira sessão com o
      // verifier guardado neste navegador — token não vaza pela URL.
      auth: { flowType: 'pkce' },
    })
  : null
