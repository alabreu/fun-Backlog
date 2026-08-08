import { create } from 'zustand'
import { sanitizeNickname } from '@core/greeting'

/**
 * Como a pessoa quer ser chamada na frase da home. `null` = ninguém escreveu
 * nada, e aí a home não mostra vocativo nenhum.
 *
 * Mesma forma do `localeStore`: o "cérebro" guarda só o valor, e a camada web
 * semeia do localStorage e persiste (ver App.tsx). Fica no aparelho e não na
 * conta de propósito — é preferência de apresentação, não dado do catálogo, e
 * levar isso para o banco custaria uma migração e uma tabela `profiles` para
 * guardar uma palavra. Quando houver mais preferências, vale reabrir.
 */
interface NicknameState {
  nickname: string | null
  setNickname: (value: string | null) => void
}

export const useNicknameStore = create<NicknameState>((set) => ({
  nickname: null,
  setNickname: (value) => set({ nickname: sanitizeNickname(value) }),
}))
