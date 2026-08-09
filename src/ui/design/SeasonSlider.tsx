import { useCallback, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { PencilSimple } from '@phosphor-icons/react'
import type { SeasonProgress } from '@core/items/seasons'
import { tick } from '@ui/haptics'
import {
  clampTyped,
  SLIDER_THUMB_PX,
  thinLabels,
  thumbOffset,
} from './sliderGeometry'

/**
 * Metade da largura do balão MAIS LARGO. Medido, não estimado: "Episódio 0" com
 * o lápis dá 123px a 16px — e o pior caso é justamente esse, porque o texto
 * longo ("Episódio N", sem temporada) só aparece no zero, que é também a ponta
 * esquerda. Com 50 aqui o balão vazava 12px para fora da margem da tela.
 */
const BALAO_META_PX = 62

/** Distância mínima entre dois RÓTULOS de temporada, em fração da trilha.
 *  11% de 334px ≈ 37px, que é a largura de "T10" com o alvo em volta. */
const ESPACO_MINIMO = 0.11

/**
 * O progresso de uma série como POSIÇÃO numa linha, não como contagem.
 *
 * Substitui campo numérico + "+1" + fileira de chips de temporada. O "+1"
 * pressupunha um ritual que não existe — ninguém abre o app para somar um
 * episódio por noite. A atualização é esporádica, e o gesto que ela pede é
 * "estou AQUI", que é um slider, não um incremento.
 *
 * UM SLIDER PARA A SÉRIE INTEIRA, e não um por temporada. A série é uma linha
 * só na cabeça de quem assiste: "estou na terceira" é uma posição nessa linha.
 * Um controle por temporada resolvia a precisão (13 episódios em toda a
 * largura contra 62) e perdia em tudo o mais — cinco controles idênticos
 * empilhados, e uma série de vinte temporadas viraria uma tela de sliders.
 *
 * O QUE TORNA ISTO UTILIZÁVEL não é o tamanho do passo, é o BALÃO AO VIVO.
 * Numa trilha de 334px, Breaking Bad dá 5,5px por episódio e The Office 1,7px
 * — ninguém mira nisso. Mira-se no texto: arrasta-se até ler "T3 E12". O
 * limite honesto é mover UM passo, e abaixo de ~2px isso é tremor de dedo;
 * por isso o campo numérico continua ao lado, como entrada exata das séries
 * muito longas.
 *
 * OS MARCOS SÃO OS CHIPS. Cada ponto na trilha é um fim de temporada, e tocar
 * no rótulo abaixo dele grava aquele número — que é o que "fechar temporada"
 * fazia numa segunda fileira de botões. Aqui a mesma ação está presa ao lugar
 * onde ela acontece.
 *
 * O BALÃO É TOCÁVEL, e é ele o campo numérico (decisão 17). Havia um `Input`
 * separado ao lado da régua; três controles para um número só, e o de baixo
 * dizendo a mesma coisa que o de cima. A precisão continua existindo — ela só
 * mudou de endereço para onde o número já estava. O lápis dentro do balão é o
 * único sinal de que ali se toca: sem ele o gesto não existe para quem não
 * tenta. Só GRAVA se algo for digitado — sair com o campo vazio desiste, senão
 * um toque acidental viraria "não vi nada disso".
 *
 * O balão sobe para 16px por causa do iOS, não por estética: o Safari dá zoom
 * na página ao focar um campo menor que isso, e um campo que muda de tamanho
 * ao ser tocado empurraria a trilha para longe do dedo. Ver `--text-input`.
 *
 * SÓ GRAVA AO SOLTAR. Arrastar dispara `change` a cada pixel; gravar em cada um
 * seria uma escrita por pixel percorrido. O valor em curso é local, e o
 * `onCommit` sai no fim do gesto — dedo, teclado ou perda de foco.
 */
export interface SeasonSliderProps {
  /** Contagem corrida de episódios vistos. */
  value: number
  total: number
  /** A divisão em temporadas, quando a fonte a conhece. Vazio = régua lisa. */
  seasons: SeasonProgress[]
  onCommit: (value: number) => void
  /** Nome acessível do controle. */
  ariaLabel: string
  /**
   * Como dizer um valor na tela e em voz alta ("T3 E12"). Vem de fora porque o
   * design system não conhece i18n — e é este texto que vira o
   * `aria-valuetext`, sem o qual o leitor de tela anuncia "34".
   */
  format: (value: number) => string
  /** Rótulo curto de uma temporada, para o marco ("T3"). */
  seasonLabel: (season: number) => string
  /** Nome acessível do balão, que é o campo de entrada exata. */
  typeLabel: string
}

export function SeasonSlider({
  value,
  total,
  seasons,
  onCommit,
  ariaLabel,
  format,
  seasonLabel,
  typeLabel,
}: SeasonSliderProps) {
  const [dragging, setDragging] = useState<number | null>(null)
  const [digitando, setDigitando] = useState<string | null>(null)
  const shown = dragging ?? value
  const focarAoAbrir = useCallback((el: HTMLInputElement | null) => {
    el?.focus()
  }, [])

  // O último fim de temporada COINCIDE com o fim da série: um ponto ali seria
  // um ponto em cima da ponta da trilha, sem nada para marcar.
  const marcos = seasons.filter((s) => s.through > 0 && s.through < total)

  // OS PONTOS SÃO TODOS; OS RÓTULOS, NÃO — ver `thinLabels`.
  const rotulados = thinLabels(marcos, (s) => s.through / total, ESPACO_MINIMO)

  // VIBRA AO CRUZAR UMA TEMPORADA, não a cada episódio. Sessenta e dois tecos
  // num arraste é um zumbido, e zumbido não informa nada; o "tec" só significa
  // alguma coisa se for raro. Cruzar de T2 para T3 é o único momento do gesto
  // que vale sentir sem olhar.
  const ultimaFaixa = useRef(faixaDe(value, seasons))
  function aoArrastar(proximo: number) {
    const faixa = faixaDe(proximo, seasons)
    if (faixa !== ultimaFaixa.current) {
      ultimaFaixa.current = faixa
      tick()
    }
    setDragging(proximo)
  }

  function comprometer() {
    if (dragging !== null) onCommit(dragging)
    setDragging(null)
  }

  /** Fecha a digitação. Grava só o que veio escrito — ver `clampTyped`. */
  function comprometerDigitado() {
    const escrito = digitando
    setDigitando(null)
    if (escrito === null) return
    const preso = clampTyped(escrito, total)
    if (preso !== null && preso !== value) onCommit(preso)
  }

  const posicao = { left: thumbOffset(shown, total) }

  return (
    <div>
      {/* Espaço para o balão. Reservado sempre, e não só quando ele aparece:
          um balão que empurra a trilha para baixo ao encostar no controle é a
          tela fugindo do dedo. */}
      <div className="relative h-9">
        {/* O CORPO do balão é PRESO dentro da trilha, e a seta NÃO.
            Centrado no polegar sem limite, metade dele fica fora da tela nos
            extremos — foi o que aconteceu com "T5 E16" no fim de Breaking Bad.
            O `clamp` para o corpo na borda; a seta continua no polegar, senão
            ela apontaria para o lugar errado justamente quando o balão saiu
            de cima dele. Por isso são irmãos, e não um dentro do outro. */}
        <div
          className="absolute bottom-1 -translate-x-1/2 transition-[left] duration-75"
          style={{
            left: `clamp(${BALAO_META_PX}px, ${posicao.left}, calc(100% - ${BALAO_META_PX}px))`,
          }}
        >
          {/* `primary`, a cor do próprio polegar — o balão pertence a ele. */}
          {digitando === null ? (
            <button
              type="button"
              aria-label={typeLabel}
              onClick={() => setDigitando('')}
              className="flex items-center gap-1 whitespace-nowrap rounded-control bg-primary px-2.5 py-1 text-input font-bold tabular-nums text-on-primary transition active:scale-95"
            >
              {format(shown)}
              <PencilSimple size={12} weight="bold" aria-hidden />
            </button>
          ) : (
            <input
              type="number"
              inputMode="numeric"
              min={0}
              max={total}
              // Começa VAZIO com o valor atual de fantasma: no celular o
              // teclado abre em cima de um campo já selecionado, e digitar o
              // primeiro dígito é o gesto — não apagar o que estava lá.
              value={digitando}
              placeholder={String(value)}
              aria-label={typeLabel}
              // FOCO PELO REF, e não `autoFocus`. O lint proíbe o atributo, e
              // com razão: ele rouba o foco de quem acabou de abrir a tela.
              // Aqui é o oposto — o campo só existe porque o dedo já tocou nele
              // um instante atrás, e não focar significaria pedir um segundo
              // toque para abrir o teclado. Ref estável para não refocar a cada
              // tecla digitada.
              ref={focarAoAbrir}
              onChange={(e) => setDigitando(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  comprometerDigitado()
                }
                // O Escape PARA AQUI. Sem isto ele sobe até o listener do
                // `Sheet` e fecha o painel inteiro — sair de um campo não pode
                // custar a tela.
                if (e.key === 'Escape') {
                  e.stopPropagation()
                  setDigitando(null)
                }
              }}
              onBlur={comprometerDigitado}
              // Largura pelo número de dígitos do total: "19" e "201" pedem
              // campos diferentes, e um campo fixo ou aperta ou sobra.
              style={{ width: `${String(total).length + 2}ch` }}
              className="block rounded-control bg-primary px-2.5 py-1 text-center text-input font-bold tabular-nums text-on-primary placeholder:text-on-primary/50"
            />
          )}
        </div>
        <span
          aria-hidden
          className="absolute bottom-0 h-2 w-2 -translate-x-1/2 rotate-45 bg-primary transition-[left] duration-75"
          style={posicao}
        />
      </div>

      <div className="relative">
        <input
          type="range"
          min={0}
          max={total}
          step={1}
          value={shown}
          aria-label={ariaLabel}
          aria-valuetext={format(shown)}
          onChange={(e) => aoArrastar(Number(e.target.value))}
          onPointerUp={comprometer}
          onKeyUp={comprometer}
          onBlur={comprometer}
          className="app-range relative z-10 w-full"
          style={
            {
              '--fill': thumbOffset(shown, total),
            } as CSSProperties
          }
        />

        {/* OS PONTOS, sobre a trilha. `pointer-events-none` é o que mantém o
            arraste funcionando quando o dedo passa por cima de um deles — sem
            isso o gesto morre ao cruzar uma temporada, que é exatamente onde
            ele mais acontece. */}
        {marcos.map((s) => (
          <span
            key={s.number}
            aria-hidden
            className="pointer-events-none absolute top-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-control bg-bg"
            style={{ left: thumbOffset(s.through, total) }}
          />
        ))}
      </div>

      {rotulados.length > 0 && (
        <div className="relative h-6">
          {rotulados.map((s) => (
            <button
              key={s.number}
              type="button"
              onClick={() => {
                tick()
                onCommit(s.through)
              }}
              // Alvo maior que o texto: o rótulo tem duas letras e ninguém
              // deveria precisar de mira para fechar uma temporada.
              className={`absolute top-0 -translate-x-1/2 px-2 py-1 text-label tabular-nums transition ${
                shown >= s.through ? 'text-ink' : 'text-muted'
              }`}
              style={{ left: thumbOffset(s.through, total) }}
            >
              {seasonLabel(s.number)}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

/** Em que temporada cai uma contagem corrida. Serve só para saber QUANDO
 *  vibrar — a tradução de verdade é `locate`, em core. */
function faixaDe(value: number, seasons: SeasonProgress[]): number {
  const encontrada = seasons.findIndex((s) => value <= s.through)
  return encontrada === -1 ? seasons.length : encontrada
}

export { SLIDER_THUMB_PX }
