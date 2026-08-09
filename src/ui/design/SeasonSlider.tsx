import { useEffect, useRef, useState } from 'react'
import type { SeasonInfo, SeasonProgress } from '@core/items/seasons'

/**
 * PROTÓTIPO EM AVALIAÇÃO — duas formas do mesmo controle, para escolher uma.
 *
 * O que ele quer substituir: campo numérico + botão "+1" + fileira de chips de
 * temporada. A hipótese é que o "+1" pressupõe um uso que não existe — ninguém
 * abre o app para somar um episódio por noite; a atualização é esporádica, e o
 * gesto que ela pede é "estou AQUI", não "mais um".
 *
 * `mode` existe só enquanto a escolha não é feita. Quando for, o perdedor sai
 * junto com o prop.
 *
 * PRECISÃO, que é o ponto que decide entre as duas formas. Numa trilha de
 * ~342px, cada episódio ocupa 8,3px em Stranger Things (42), 5,6 em Breaking
 * Bad (62) e 1,7 em The Office (201). O que torna isso utilizável não é o
 * tamanho do passo — é o RÓTULO AO VIVO: ninguém mira num pixel, arrasta-se até
 * ler "T3 E12". O limite real é conseguir mover UM passo, e abaixo de ~2px por
 * passo isso fica no nível do tremor do dedo. Por isso o campo numérico
 * continua existindo ao lado: ele é a entrada exata das séries muito longas.
 *
 * SÓ COMPROMETE AO SOLTAR. Arrastar dispara `change` a cada pixel, e gravar em
 * cada um seria uma escrita por pixel percorrido. O valor em curso é local; o
 * `onCommit` sai no fim do gesto (dedo, teclado ou perda de foco).
 */
export interface SeasonSliderProps {
  /** Contagem corrida de episódios vistos. */
  value: number
  total: number
  /** A divisão em temporadas, quando a fonte a conhece. */
  seasons: SeasonProgress[]
  onCommit: (value: number) => void
  /** Nome acessível do controle. */
  ariaLabel: string
  /**
   * Como dizer um valor em voz alta e na tela ("T3 E12"). Vem de fora porque
   * o design system não conhece i18n — e é este texto que vira o
   * `aria-valuetext`, sem o qual o leitor de tela anuncia "34".
   */
  format: (value: number) => string
  /** Rótulo curto de uma temporada, para o marco ("T3"). */
  seasonLabel: (season: number) => string
  mode?: 'single' | 'stacked'
}

export function SeasonSlider(props: SeasonSliderProps) {
  return props.mode === 'stacked' ? (
    <StackedSliders {...props} />
  ) : (
    <SingleSlider {...props} />
  )
}

/**
 * UM slider para a série inteira, com marcos nos fins de temporada.
 *
 * A série é uma linha só na cabeça de quem assiste — "estou na terceira" é uma
 * posição nessa linha, não um contêiner separado. Os marcos são o que devolve a
 * leitura por temporada sem quebrar a linha em pedaços, e tocar num deles fecha
 * aquela temporada: é a fileira de chips embutida na régua.
 */
function SingleSlider({
  value,
  total,
  seasons,
  onCommit,
  ariaLabel,
  format,
  seasonLabel,
}: SeasonSliderProps) {
  const [dragging, setDragging] = useState<number | null>(null)
  const shown = dragging ?? value

  // O último fim de temporada COINCIDE com o fim da série — um marco ali seria
  // um traço em cima do fim da trilha, sem nada para marcar.
  const marcos = seasons.filter((s) => s.through < total)

  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between gap-2">
        <span className="text-body font-semibold tabular-nums">
          {format(shown)}
        </span>
        <span className="text-label tabular-nums text-muted">
          {shown} / {total}
        </span>
      </div>

      <div className="relative">
        <input
          type="range"
          min={0}
          max={total}
          step={1}
          value={shown}
          aria-label={ariaLabel}
          // Sem isto o leitor de tela anuncia "34" — o número que a feature de
          // temporadas existe justamente para traduzir.
          aria-valuetext={format(shown)}
          onChange={(e) => setDragging(Number(e.target.value))}
          // Fim do gesto, nas três formas de terminá-lo.
          onPointerUp={() => {
            if (dragging !== null) onCommit(dragging)
            setDragging(null)
          }}
          onKeyUp={() => {
            if (dragging !== null) onCommit(dragging)
            setDragging(null)
          }}
          onBlur={() => {
            if (dragging !== null) onCommit(dragging)
            setDragging(null)
          }}
          className="app-range w-full"
          style={{ '--fill': `${(shown / total) * 100}%` } as React.CSSProperties}
        />

        {/* Os marcos ficam ABAIXO da trilha, e são botões de verdade: tocar em
            "T3" grava o fim da temporada 3. É a fileira de chips que este
            controle substitui, presa à posição onde ela de fato acontece. */}
        {marcos.length > 0 && (
          <div className="relative mt-1 h-5">
            {marcos.map((s) => (
              <button
                key={s.number}
                type="button"
                onClick={() => onCommit(s.through)}
                // `-translate-x-1/2` centra o rótulo no ponto; o alvo é maior
                // que o texto para o toque não exigir mira.
                className={`absolute top-0 -translate-x-1/2 px-1.5 text-label tabular-nums transition ${
                  shown >= s.through ? 'text-ink' : 'text-muted'
                }`}
                style={{ left: `${(s.through / total) * 100}%` }}
              >
                {seasonLabel(s.number)}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

/**
 * UM slider POR TEMPORADA.
 *
 * Ganha em precisão — a temporada 3 de Breaking Bad tem 13 episódios em toda a
 * largura, 26px por passo contra 5,6 do slider único — e perde em tudo o mais:
 * repete o mesmo controle N vezes, gasta N linhas, e numa série de vinte
 * temporadas vira uma tela de sliders.
 */
function StackedSliders({
  value,
  seasons,
  onCommit,
  format,
  seasonLabel,
}: SeasonSliderProps) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-body font-semibold tabular-nums">
        {format(value)}
      </span>
      {seasons.map((s) => (
        <SeasonRow
          key={s.number}
          season={s}
          label={seasonLabel(s.number)}
          onCommit={(watched) => onCommit(s.through - s.episodes + watched)}
        />
      ))}
    </div>
  )
}

function SeasonRow({
  season,
  label,
  onCommit,
}: {
  season: SeasonProgress
  label: string
  onCommit: (watched: number) => void
}) {
  const [dragging, setDragging] = useState<number | null>(null)
  const shown = dragging ?? season.watched

  // O valor vem de fora enquanto ninguém arrasta ESTA linha: mexer numa
  // temporada muda a contagem corrida, e as outras linhas têm que refletir.
  const anterior = useRef(season.watched)
  useEffect(() => {
    anterior.current = season.watched
  }, [season.watched])

  return (
    <div className="flex items-center gap-2">
      <span className="w-8 shrink-0 text-label tabular-nums text-muted">
        {label}
      </span>
      <input
        type="range"
        min={0}
        max={season.episodes}
        step={1}
        value={shown}
        aria-label={label}
        aria-valuetext={`${shown} / ${season.episodes}`}
        onChange={(e) => setDragging(Number(e.target.value))}
        onPointerUp={() => {
          if (dragging !== null) onCommit(dragging)
          setDragging(null)
        }}
        onKeyUp={() => {
          if (dragging !== null) onCommit(dragging)
          setDragging(null)
        }}
        className="app-range min-w-0 flex-1"
        style={
          {
            '--fill': `${(shown / season.episodes) * 100}%`,
          } as React.CSSProperties
        }
      />
      <span className="w-10 shrink-0 text-right text-label tabular-nums text-muted">
        {shown}/{season.episodes}
      </span>
    </div>
  )
}

/** Reexportado para a vitrine montar dados de exemplo sem importar de core. */
export type { SeasonInfo }
