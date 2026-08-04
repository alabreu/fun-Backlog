/**
 * Identidade do app + chaves de armazenamento. RENOMEIE ao criar um app novo
 * (mantenha em sincronia com vite.config.ts e index.html).
 */
export const APP_NAME = 'Fun Backlog'

/** Slug usado como prefixo de toda chave de localStorage (evita colisão entre apps no mesmo domínio de dev). */
export const STORAGE_PREFIX = 'fun-backlog'

export function storageKey(name: string): string {
  return `${STORAGE_PREFIX}.${name}`
}
