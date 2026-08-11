import { useEffect, useRef } from 'react'
import { sameProfile, type Profile } from '@core/profile/profile'
import { loadProfile, saveProfile } from '@core/profile/repository'
import { useAuthStore } from '@core/state/authStore'
import { useLocaleStore } from '@core/state/localeStore'
import { useMediaStore } from '@core/state/mediaStore'
import { useNicknameStore } from '@core/state/nicknameStore'
import { useRegionStore } from '@core/state/regionStore'
import { useSafeSearchStore } from '@core/state/safeSearchStore'
import { useThemeStore } from '@core/state/themeStore'
import { LOCKED_THEME } from '@core/theme'

/**
 * AS PREFERÊNCIAS SEGUEM A CONTA, não o aparelho.
 *
 * Tema, vocativo, idioma, país, filtro de conteúdo adulto e categorias viviam
 * só no localStorage: trocar de celular perdia os seis. Aqui eles ganham uma
 * segunda casa (a tabela `profiles`, migração 0009) sem perder a primeira — o
 * localStorage continua sendo escrito pelo `App.tsx` e vira CACHE. É ele que
 * faz o app abrir já no idioma certo, sem esperar a rede, e é ele que serve
 * quem está sem conta: o modo convidado não muda em nada.
 *
 * A NUVEM GANHA AO ENTRAR (escolha do usuário, 11/08/2026). Entrar na conta num
 * aparelho novo traz o app do jeito que você deixou — é a promessa inteira da
 * feature, e uma regra mais esperta ("o mais recente vence") dependeria do
 * relógio do celular estar certo e seria invisível quando escolhesse errado.
 *
 * A EXCEÇÃO É A PRIMEIRA VEZ: sem linha na conta, quem manda é o aparelho, e o
 * que está nele vira o perfil. Sem isso, o primeiro login de quem já usava o
 * app como convidado apagaria as escolhas dele com os padrões de fábrica.
 */

/** Espera antes de gravar. O vocativo é digitado letra a letra, e sem isto cada
 *  tecla viraria um UPDATE; meio segundo junta a palavra inteira numa escrita. */
const DEBOUNCE_MS = 600

export function useProfileSync(): void {
  const user = useAuthStore((s) => s.user)

  const locale = useLocaleStore((s) => s.locale)
  const setLocale = useLocaleStore((s) => s.setLocale)
  const theme = useThemeStore((s) => s.theme)
  const setTheme = useThemeStore((s) => s.setTheme)
  const region = useRegionStore((s) => s.region)
  const regionChosen = useRegionStore((s) => s.chosen)
  const seedRegion = useRegionStore((s) => s.seedRegion)
  const nickname = useNicknameStore((s) => s.nickname)
  const setNickname = useNicknameStore((s) => s.setNickname)
  const safeSearch = useSafeSearchStore((s) => s.safeSearch)
  const setSafeSearch = useSafeSearchStore((s) => s.setSafeSearch)
  const mediaPreferences = useMediaStore((s) => s.preferences)
  const setMediaPreferences = useMediaStore((s) => s.setPreferences)

  /**
   * O PERFIL COMO ELE ESTÁ NA NUVEM, na melhor informação que temos.
   *
   * É o que impede o laço bobo: aplicar o que veio da nuvem mexe nas stores,
   * mexer nas stores dispara o efeito que grava, e sem esta memória o app faria
   * um UPDATE a cada login para escrever exatamente o que acabou de ler.
   */
  const gravado = useRef<Profile | null | 'ilegivel'>(null)
  /** De quem é o perfil já carregado. Trocar de conta tem que recarregar. */
  const carregadoDe = useRef<string | null>(null)

  // O PAÍS SÓ VIAJA QUANDO FOI ESCOLHIDO. Deduzido não é preferência: o app
  // refaz o palpite a cada boot (fuso, depois idioma), e sincronizá-lo faria o
  // palpite de um aparelho virar escolha em todos os outros.
  const atual: Profile = {
    locale,
    theme,
    region: regionChosen ? region : null,
    nickname,
    safeSearch,
    mediaPreferences,
  }

  // ---------------------------------------------------------------------
  // 1. Entrar: a nuvem manda (ou o aparelho, se ainda não houver perfil).
  // ---------------------------------------------------------------------
  useEffect(() => {
    if (!user) {
      // Sair não mexe em nada do que está na tela: as preferências continuam
      // valendo neste aparelho, como valeriam para um convidado. O que se perde
      // é só o vínculo — e o próximo login recarrega.
      carregadoDe.current = null
      gravado.current = null
      return
    }
    if (carregadoDe.current === user.id) return
    carregadoDe.current = user.id

    let cancelado = false
    void loadProfile()
      .then((remoto) => {
        if (cancelado) return
        if (!remoto) {
          // PRIMEIRO LOGIN desta conta: o aparelho vira o perfil. O efeito de
          // gravar abaixo faz a escrita — aqui só marcamos que não há nada na
          // nuvem para comparar.
          gravado.current = null
          return
        }
        gravado.current = remoto
        setLocale(remoto.locale)
        // Com o tema travado, a escolha guardada é ignorada pelo mesmo motivo
        // que o `App.tsx` ignora a do localStorage: ninguém pode ficar preso
        // num tema que o app não oferece mais.
        if (!LOCKED_THEME) setTheme(remoto.theme)
        // `true` porque só escolha viaja: se veio da nuvem, alguém escolheu.
        if (remoto.region) seedRegion(remoto.region, true)
        setNickname(remoto.nickname)
        setSafeSearch(remoto.safeSearch)
        setMediaPreferences(remoto.mediaPreferences)
      })
      .catch(() => {
        // Falhou a leitura: NÃO grava nada. Uma falha de rede lida como "esta
        // conta não tem perfil" faria o aparelho sobrescrever o que está na
        // nuvem — que é a única forma de perder dado aqui. Deixando
        // `carregadoDe` marcado, a sincronização desta sessão simplesmente não
        // acontece, e o próximo login tenta de novo.
        gravado.current = 'ilegivel'
      })
    return () => {
      cancelado = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id])

  // ---------------------------------------------------------------------
  // 2. Mudou alguma coisa: grava.
  // ---------------------------------------------------------------------
  useEffect(() => {
    if (!user || carregadoDe.current !== user.id) return
    // Leitura que falhou (ver o catch acima): não dá para saber o que está lá,
    // então não se escreve por cima.
    if (gravado.current === 'ilegivel') return
    if (gravado.current && sameProfile(gravado.current, atual)) return

    const timer = setTimeout(() => {
      const enviado = atual
      void saveProfile(enviado)
        .then(() => {
          gravado.current = enviado
        })
        // Falha em silêncio: preferência é um "seria bom", e um aviso na tela
        // por não ter conseguido sincronizar o vocativo seria pior que o
        // problema. O localStorage já guardou; a próxima mudança tenta de novo.
        .catch(() => {})
    }, DEBOUNCE_MS)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    user?.id,
    locale,
    theme,
    region,
    regionChosen,
    nickname,
    safeSearch,
    mediaPreferences,
  ])
}
