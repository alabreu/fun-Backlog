import { supabase } from '@core/backend/client'
import { normalizeProfile, profileToRow, type Profile, type ProfileRow } from './profile'

/**
 * Onde as preferências da conta vivem. Passa pela costura de
 * `core/backend/client.ts` como todo o resto — ver README.
 *
 * SÓ NUVEM, e não um par local/nuvem como o `itemsRepository`. O lado local
 * dessas preferências já existe e é o localStorage que o `App.tsx` semeia e
 * escreve; duplicá-lo atrás de uma interface faria duas verdades para o mesmo
 * dado. Aqui é só a metade que atravessa aparelhos.
 */

/**
 * O perfil guardado, ou `null` quando ainda não existe um.
 *
 * `null` é a resposta que decide o sentido da primeira sincronização: sem linha,
 * quem manda é o aparelho (e o que está nele vira o perfil); com linha, quem
 * manda é a nuvem. Ver `useProfileSync`.
 *
 * Erro de rede também devolve `null`... NÃO. Erro estoura, de propósito: com
 * `null` engolido, uma falha momentânea seria lida como "esta conta não tem
 * perfil" e o aparelho sobrescreveria o que está na nuvem. Quem chama trata o
 * erro sem aplicar nada, que é o único desfecho seguro.
 */
export async function loadProfile(): Promise<Profile | null> {
  if (!supabase) throw new Error('backend-not-configured')

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .maybeSingle()
  if (error) throw error
  return data ? normalizeProfile(data as ProfileRow) : null
}

/**
 * Grava o perfil inteiro, criando a linha se ela não existir.
 *
 * `upsert` e não insert-ou-update decidido pelo app: quem sabe se a linha
 * existe é o banco, e perguntar antes seria uma ida a mais para chegar na
 * mesma escrita — com uma corrida no meio, se dois aparelhos entrarem juntos.
 *
 * A LINHA INTEIRA a cada gravação, e não só o campo que mudou. São seis valores
 * pequenos que a tela já tem em mãos, e mandar tudo torna impossível o estado
 * meio-gravado que um patch parcial permite quando duas mudanças se cruzam.
 */
export async function saveProfile(profile: Profile): Promise<void> {
  if (!supabase) throw new Error('backend-not-configured')

  const { data: session } = await supabase.auth.getUser()
  const userId = session.user?.id
  if (!userId) throw new Error('unauthenticated')

  // `user_id` explícito porque a RLS exige que ele bata com `auth.uid()` — e é
  // ele também que faz o upsert saber qual linha é esta (é a chave primária).
  const { error } = await supabase.from('profiles').upsert({
    ...profileToRow(profile),
    user_id: userId,
    updated_at: new Date().toISOString(),
  })
  if (error) throw error
}
