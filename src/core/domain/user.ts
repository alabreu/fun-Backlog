/** Usuário autenticado — formato portável do domínio (nenhum tipo do provedor vaza). */
export interface AuthUser {
  id: string
  email?: string
  name?: string
  avatarUrl?: string
}
