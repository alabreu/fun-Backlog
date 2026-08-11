import { create } from 'zustand'
import { sanitizeNickname } from '@core/greeting'

/**
 * Como a pessoa quer ser chamada na frase da home. `null` = ninguém escreveu
 * nada, e aí a home não mostra vocativo nenhum.
 *
 * Mesma forma do `localeStore`: o "cérebro" guarda só o valor, e a camada web
 * semeia do localStorage e persiste (ver App.tsx). Desde 11/08/2026 ele também
 * SEGUE A CONTA — a tabela `profiles` da migração 0009, via `useProfileSync`.
 * O localStorage continua sendo escrito e vira cache: é ele que serve quem está
 * sem conta e é ele que abre a tela antes de a rede responder.
 */
interface NicknameState {
  nickname: string | null
  setNickname: (value: string | null) => void
}

export const useNicknameStore = create<NicknameState>((set) => ({
  nickname: null,
  setNickname: (value) => set({ nickname: sanitizeNickname(value) }),
}))
