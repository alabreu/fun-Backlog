#!/usr/bin/env node
/**
 * Guarda de SEGREDOS: quebra o `npm run lint` se uma credencial entrar no
 * repositório.
 *
 * POR QUE ELE EXISTE, e por que só agora. Em 16/11/2026 uma revisão encontrou
 * as credenciais do app — OAuth do Google, client secret da Twitch (IGDB) e os
 * dois valores da TMDB — em TEXTO PURO numa página de notas. O repositório
 * estava limpo: varredura da árvore e de todos os commits que já existiram não
 * achou nada. Ou seja, a disciplina funcionou e mesmo assim o segredo vazou —
 * por um caminho que nenhum gate cobria.
 *
 * Este script não teria pego aquilo (a nota não é um arquivo daqui). Ele existe
 * porque o conserto do vazamento foi rotacionar tudo, e uma credencial NOVA
 * recém-colada é exatamente quando o dedo escorrega para um `.ts` de teste.
 *
 * O QUE ELE NÃO FAZ: olhar o histórico. Ele varre o que está rastreado AGORA,
 * que é o que está prestes a virar commit. Para o histórico existe o comando no
 * fim deste comentário — ele é lento (lê todo blob que já existiu) e não tem
 * lugar num lint que roda a cada commit:
 *
 *   git rev-list --objects --all | while read sha caminho; do \
 *     [ -n "$caminho" ] && git cat-file -p "$sha" 2>/dev/null | grep -qE '<padrão>' \
 *     && echo "$caminho@$sha"; done
 *
 * E o que mais importa, escrito aqui porque é onde alguém vai ler depois de um
 * susto: APAGAR O TEXTO NÃO REVOGA O SEGREDO. Um valor que já esteve num commit
 * continua no histórico, num fork, no cache do GitHub e no backup de quem
 * clonou. Um valor que já esteve numa nota continua no histórico de versões
 * dela. A única coisa que encerra a exposição é rotacionar no provedor.
 */
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'

/**
 * A FORMA de cada credencial que este app usa, mais as de provedores vizinhos
 * que um dia podem entrar. Formas, e não valores: um gate que carrega o segredo
 * para compará-lo é o próprio vazamento que ele diz impedir.
 *
 * As duas últimas são LARGAS de propósito — hex de 32 e alfanumérico de 30 não
 * têm prefixo que os denuncie, e são justamente o formato da chave v3 da TMDB e
 * do client secret da Twitch. Elas dão falso positivo em hash; é por isso que
 * `IGNORADOS` existe, e é por isso que a mensagem de erro ensina a declarar a
 * exceção em vez de mandar desligar o check.
 */
const PADROES = [
  ['segredo de cliente OAuth do Google', /GOCSPX-[\w-]{20,}/],
  ['id de cliente OAuth do Google', /\d{10,}-[a-z\d]{20,}\.apps\.googleusercontent\.com/],
  ['JWT (anon/service_role do Supabase, token v4 da TMDB)', /eyJ[\w-]{10,}\.eyJ[\w-]{10,}\.[\w-]{10,}/],
  ['chave publicável/secreta do Supabase', /sb_(publishable|secret)_[\w-]{20,}/],
  ['chave da OpenAI/OpenRouter', /sk-[a-zA-Z\d]{2,}-[\w-]{20,}/],
  ['token do GitHub', /gh[pousr]_[a-zA-Z\d]{30,}/],
  ['chave de acesso da AWS', /AKIA[\dA-Z]{16}/],
  ['token do Slack', /xox[abprs]-[\w-]{10,}/],
  ['bloco de chave privada', /-----BEGIN [A-Z ]*PRIVATE KEY-----/],
  ['chave v3 da TMDB (hex de 32)', /(?<![a-fA-F\d])[a-f\d]{32}(?![a-fA-F\d])/],
  ['client secret da Twitch/IGDB (30 alfanuméricos)', /(?<![a-zA-Z\d])[a-z\d]{30}(?![a-zA-Z\d])/],
]

/**
 * O JWT do Supabase é o caso especial: a anon key é PÚBLICA por design
 * (protegida por RLS) e pode ser commitada — ver SECURITY.md. Mas a
 * service_role tem a mesma forma e é acesso total. Como o gate não distingue as
 * duas pela forma, ele barra as duas e manda declarar — assim a anon key entra
 * por decisão escrita, não por descuido.
 */
const IGNORADOS = new Set([
  // Lockfile é hash de integridade do começo ao fim: barulho puro para o
  // padrão hex de 32, e nada de credencial entra ali.
  'package-lock.json',
])

/** Uma linha pode se declarar isenta, com motivo — o mesmo contrato do
 *  `ds-ok` do check do design system. Sem motivo escrito, não vale. */
const ISENCAO = /secret-ok:\s*\S+/

const arquivos = execFileSync('git', ['ls-files'], { encoding: 'utf8' })
  .split('\n')
  .filter((caminho) => caminho && !IGNORADOS.has(caminho))

const achados = []

for (const caminho of arquivos) {
  let texto
  try {
    texto = readFileSync(caminho, 'utf8')
  } catch {
    continue // binário, link quebrado, submódulo
  }
  // Binário disfarçado de texto: um PNG lido como utf8 vira ruído que casa com
  // qualquer coisa larga.
  if (texto.includes('\u0000')) continue

  texto.split('\n').forEach((linha, i) => {
    if (ISENCAO.test(linha)) return
    for (const [nome, padrao] of PADROES) {
      if (padrao.test(linha)) {
        // NUNCA o valor. Local e formato bastam para quem vai consertar, e o
        // relatório deste script acaba em log de CI, que é público no mesmo
        // sentido em que a nota era privada.
        achados.push({ caminho, linha: i + 1, nome })
        break
      }
    }
  })
}

if (achados.length > 0) {
  console.error('✗ Possível credencial em arquivo rastreado:\n')
  for (const { caminho, linha, nome } of achados)
    console.error(`  ${caminho}:${linha} — ${nome}`)
  console.error(`
O valor não é impresso de propósito.

Se for credencial de verdade:
  1. NÃO basta apagar a linha. Rotacione no provedor — o valor já está no seu
     disco, e estará no histórico assim que virar commit.
  2. Mova para onde ele deve viver: secret de Edge Function (servidor) ou
     env var da Vercel. Ver SECURITY.md.

Se for falso positivo (hash, id, exemplo), declare na própria linha:
  // secret-ok: <por que não é segredo>
`)
  process.exit(1)
}

console.log('✓ Segredos: nenhuma credencial em arquivo rastreado.')
