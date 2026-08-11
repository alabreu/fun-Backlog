import { CaretDown } from '@phosphor-icons/react'
import { useId } from 'react'
import { WaveDivider } from './WaveDivider'
import type { ReactNode } from 'react'

/**
 * Seção com título colapsável — a organização da estante.
 *
 * Substituiu o filtro de chips, e a diferença é de carga mental: o chip mostra
 * UM estado por vez e esconde que os outros existem, então saber "quantos eu
 * tenho pausados" custava um toque e um retorno. A seção mostra a estrutura
 * inteira de uma vez, e o que você quer esconder você fecha.
 *
 * O CABEÇALHO É UM BOTÃO, com o nome à esquerda e contador + seta à direita.
 *
 * O nome usa `text-title` (20px), um degrau abaixo do `text-display` (24px) do
 * título da tela: a seção é subordinada ao título, e a diferença de tamanho é o
 * que diz isso sem precisar de recuo nem de linha divisória. Ele deixou de ser
 * caixa alta miúda em cinza — aquilo era um RÓTULO de seção, e isto aqui é um
 * título de verdade, com conteúdo próprio embaixo e um controle do lado.
 *
 * SEÇÃO VAZIA FICA APAGADA — o título troca de `ink` para `muted`, e a linha
 * inteira passa a ser cinza. É a mesma coisa que 63% de opacidade do `ink`
 * (medido), mas por token: pôr `opacity-60` no cabeçalho apagaria TAMBÉM o
 * contador e a seta, que já são `muted`, e o contador cairia para 3.35:1 —
 * abaixo do mínimo AA. Aqui cada cor continua sendo uma que o
 * `check-contrast` verifica.
 *
 * A seta gira em vez de trocar de ícone: é o mesmo objeto mudando de estado, e
 * a rotação diz isso sem pedir uma segunda leitura. Ela respeita
 * `prefers-reduced-motion` pela transição global do projeto.
 *
 * APONTANDO PARA BAIXO quando fechado e PARA CIMA quando aberto: a seta indica
 * para onde o conteúdo vai. Fechada, ele desce para dentro da tela; aberta, ele
 * recolhe para cima. A convenção inversa (seta para a direita quando fechado)
 * é de árvore de arquivos, e aqui não há hierarquia para navegar.
 *
 * `aria-expanded` + `aria-controls` são o que faz o leitor de tela anunciar
 * "recolhido/expandido" e saber qual região o botão comanda — sem eles isto é
 * um botão que muda coisas invisíveis.
 *
 * FECHADO, O CONTEÚDO SAI DO DOM. Poderia ser `hidden`, mas a estante tem
 * dezenas de capas por seção: manter todas montadas custaria imagem carregada
 * para o que ninguém está vendo.
 */
export interface SectionProps {
  title: string
  /** Quantos itens há aqui. Aparece ao lado da seta, sempre — inclusive zero. */
  count: number
  /** Só faz sentido com `collapsible`: sem ele a seção está sempre aberta. */
  open?: boolean
  onToggle?: () => void
  /** Mostrado no lugar do conteúdo quando não há nada. */
  emptyLabel: string
  /**
   * `false` tira o botão e a seta: o título vira só um título, e o conteúdo
   * fica sempre à mostra. É o caso da BUSCA — uma seção que só está ali porque
   * tem acerto não faz sentido poder ser fechada, e uma seta que some ao
   * digitar diz isso melhor que uma seta que existe mas não deveria ser usada.
   */
  collapsible?: boolean
  children: ReactNode
  className?: string
}

export function Section({
  title,
  count,
  // Uma seção que não colapsa não tem estado de abertura para o pai guardar —
  // exigir os dois dela obrigaria a inventar um `() => {}` no lugar da chamada,
  // que é ruído fingindo ser API.
  open = true,
  onToggle,
  emptyLabel,
  collapsible = true,
  children,
  className = '',
}: SectionProps) {
  const id = useId()
  const aberta = open || !collapsible

  // SEM `flex-1`: quem cresce agora é a onda. O título fica com a largura do
  // texto e continua encolhendo (`shrink` é o padrão) quando não couber, então
  // um nome longo trunca e a onda simplesmente some — que é a ordem certa de
  // sacrifício entre um enfeite e o nome da seção.
  const nome = (
    <span
      className={`min-w-0 truncate text-title font-bold tracking-tight ${
        count > 0 ? 'text-ink' : 'text-muted'
      }`}
    >
      {title}
    </span>
  )

  // A ONDA preenche o vão entre o nome e a contagem. `basis-0` é o que a faz
  // ficar com TODA a folga e nenhum encolhimento: com base zero ela não
  // participa do aperto, e o truncamento cai inteiro sobre o título.
  //
  // Mais apagada numa seção vazia, junto com o título: uma onda viva ao lado
  // de um nome cinza puxaria o olho para o enfeite.
  const onda = (
    <WaveDivider
      className={`flex-1 basis-0 ${count > 0 ? 'text-ink/20' : 'text-ink/10'}`}
    />
  )
  // `tabular-nums` para o contador não empurrar a seta ao trocar de 1 para
  // 10 — a seta é o alvo, e alvo que dança é alvo que erra.
  const contador = (
    <span className="text-body tabular-nums text-muted">{count}</span>
  )

  return (
    // O RESPIRO ENTRE SEÇÕES MORA AQUI, na `section`, e não no bloco de
    // conteúdo — que é onde ele estava. A diferença aparece na seção FECHADA:
    // sem conteúdo renderizado, o respiro de lá simplesmente não existia, e
    // duas seções recolhidas ficavam mais coladas que duas abertas. Na
    // `section` ele vale nos dois estados.
    //
    // 24px aqui + 8px do cabeçalho de baixo = 32px entre uma seção e a
    // seguinte (escolha do usuário, 10/08/2026, medido na tela).
    <section className={`pb-6 ${className}`}>
      {/* O título é um `h2` nos DOIS modos: é o que deixa quem usa leitor de
          tela pular de seção em seção. Colapsável, o botão vai DENTRO dele —
          é o padrão de acordeão da WAI-ARIA, e não o contrário. */}
      <h2>
        {collapsible ? (
          <button
            type="button"
            aria-expanded={open}
            aria-controls={id}
            onClick={onToggle}
            className="flex w-full items-center gap-3 py-2 text-left"
          >
            {nome}
            {onda}
            {contador}
            <CaretDown
              size={18}
              weight="bold"
              aria-hidden
              className={`shrink-0 text-muted transition-transform ${
                open ? 'rotate-180' : ''
              }`}
            />
          </button>
        ) : (
          <span className="flex w-full items-center gap-3 py-2">
            {nome}
            {onda}
            {contador}
          </span>
        )}
      </h2>

      {aberta && (
        <div id={id}>
          {count > 0 ? (
            children
          ) : (
            <p className="py-1 text-body text-muted">{emptyLabel}</p>
          )}
        </div>
      )}
    </section>
  )
}
