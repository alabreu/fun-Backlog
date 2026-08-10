import { create } from 'zustand'

/**
 * Esconder conteúdo de gênero adulto nas buscas.
 *
 * LIGADO POR PADRÃO, e o padrão é a decisão que mais importa aqui: quem quer
 * ver esse conteúdo sabe procurar a chave; quem não quer não deveria precisar
 * descobrir que ela existe depois de topar com uma capa dessas. É também o que
 * protege o caso de alguém pegar o celular emprestado.
 *
 * Mesma forma dos outros stores de preferência: o "cérebro" guarda só o valor,
 * e a camada web semeia do localStorage e persiste (ver App.tsx). Vai junto na
 * dívida já registrada de levar as preferências para a conta — hoje trocar de
 * aparelho recomeça com o filtro ligado, que é o lado seguro de errar.
 */
interface SafeSearchState {
  safeSearch: boolean
  setSafeSearch: (safeSearch: boolean) => void
}

export const useSafeSearchStore = create<SafeSearchState>((set) => ({
  safeSearch: true,
  setSafeSearch: (safeSearch) => set({ safeSearch }),
}))
