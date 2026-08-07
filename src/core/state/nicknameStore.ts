import { create } from 'zustand'
import { sanitizeNickname, type DailyReroll } from '@core/greeting'

/**
 * Como a pessoa quer ser chamada na saudação da home.
 *
 * Dois valores, e a separação é o ponto:
 * - `nickname`: apelido fixo, escolhido à mão. `null` = deixar rotacionar.
 * - `reroll`: um sorteio que vale só para HOJE. Guardar o dia junto é o que
 *   impede o botão de sortear de virar um segundo jeito de fixar apelido —
 *   amanhã o dia não confere e a rotação volta sozinha.
 *
 * Mesma forma do `localeStore`: o "cérebro" guarda só o valor, e a camada web
 * semeia do localStorage e persiste (ver App.tsx). Fica no aparelho e não na
 * conta de propósito — é preferência de apresentação, não dado do catálogo, e
 * levar isso para o banco custaria uma migração e uma tabela `profiles` para
 * guardar uma palavra. Quando houver mais preferências, vale reabrir.
 */
interface NicknameState {
  nickname: string | null
  reroll: DailyReroll | null
  setNickname: (value: string | null) => void
  setReroll: (value: DailyReroll | null) => void
}

export const useNicknameStore = create<NicknameState>((set) => ({
  nickname: null,
  reroll: null,
  setNickname: (value) => set({ nickname: sanitizeNickname(value) }),
  setReroll: (value) => set({ reroll: value }),
}))
