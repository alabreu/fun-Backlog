import { create } from 'zustand'
import { DEFAULT_REGION, type Region } from '@core/region'

/**
 * País atual. Mesma forma do `localeStore`: o "cérebro" guarda só o valor, e a
 * camada web semeia do navegador/localStorage e persiste (ver App.tsx).
 *
 * `chosen` separa ESCOLHA de CHUTE, e a diferença muda o que o boot pode fazer:
 * um chute (deduzido do fuso ou do idioma) pode ser refeito no boot seguinte —
 * é o que corrige sozinho quem ganhou o país errado, e acompanha quem se muda
 * de país. Uma escolha feita na tela nunca é tocada. Sem esta marca, o chute
 * errado de ontem viraria "preferência" para sempre.
 */
interface RegionState {
  region: Region
  /** A pessoa escolheu na tela (`true`) ou o app deduziu (`false`)? */
  chosen: boolean
  /** Ação da PESSOA — marca a escolha como definitiva. */
  setRegion: (region: Region) => void
  /** Semeadura do boot — repõe valor e proveniência sem promover chute. */
  seedRegion: (region: Region, chosen: boolean) => void
}

export const useRegionStore = create<RegionState>((set) => ({
  region: DEFAULT_REGION,
  chosen: false,
  setRegion: (region) => set({ region, chosen: true }),
  seedRegion: (region, chosen) => set({ region, chosen }),
}))
