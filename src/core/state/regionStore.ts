import { create } from 'zustand'
import { DEFAULT_REGION, type Region } from '@core/region'

/**
 * País atual. Mesma forma do `localeStore`: o "cérebro" guarda só o valor, e a
 * camada web semeia do navegador/localStorage e persiste (ver App.tsx).
 */
interface RegionState {
  region: Region
  setRegion: (region: Region) => void
}

export const useRegionStore = create<RegionState>((set) => ({
  region: DEFAULT_REGION,
  setRegion: (region) => set({ region }),
}))
