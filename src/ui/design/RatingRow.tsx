import { Heart, Star } from '@phosphor-icons/react'

/**
 * As cinco estrelas + o botão de "favorita".
 *
 * DOIS EIXOS NUMA LINHA SÓ, e é isso que o desenho precisa comunicar: a nota
 * responde "isto é bom?" e o favorito responde "isto é meu". Antes eram seis
 * ícones centralizados, e o coração no fim de uma fileira de estrelas lia como
 * a SEXTA estrela — a forma e a cor não bastavam para separar o que a posição
 * insistia em juntar.
 *
 * Agora a separação é ESTRUTURAL: estrelas à esquerda, favorito à direita, e
 * entre eles o vazio da linha. O coração ganhou rótulo escrito ("Favorito") e
 * a moldura de um botão de alternância — as duas coisas dizem, sem depender de
 * cor, que ali começa outra pergunta, e que ela é de sim ou não (WCAG 1.4.1).
 *
 * Alvos de 44px (WCAG 2.5.5). Numa fileira de seis, alvo pequeno erra de casa —
 * e errar aqui grava a nota errada.
 *
 * APAGAR É TOCAR NA ESTRELA DA NOTA ATUAL. Não há mais botão "Limpar" ao lado
 * do rótulo (decisão do usuário, 09/08/2026): o gesto sozinho responde, e a
 * linha ficou com uma coisa a menos. O que sustenta essa escolha é o
 * `labels.clear` — sem ele o gesto seria invisível para leitor de tela.
 */
export interface RatingRowProps {
  /** 1 a 5, ou ausente para "sem nota". */
  value?: number
  favorite?: boolean
  onChange: (value: number | undefined) => void
  onFavoriteChange: (favorite: boolean) => void
  /** Rótulos acessíveis — o componente não conhece i18n. */
  labels: {
    /** Recebe a posição da estrela, ex.: "Dar nota 3". */
    star: (value: number) => string
    /**
     * O que a estrela da nota ATUAL faz: apagar.
     *
     * Não é enfeite de acessibilidade — é a única forma de saber que a saída
     * existe quando não há botão "Limpar" na tela. Sem isto, quem navega por
     * leitor de tela ouve "nota 4, ativado" e não tem como descobrir que tocar
     * ali de novo remove; a nota vira um dado impossível de apagar, que é
     * exatamente o problema que o botão veio resolver um dia.
     */
    clear: string
    /** O rótulo ESCRITO do botão de favorito ("Favorito"). */
    favorite: string
    /** O que o toque vai fazer, para o leitor de tela ("Marcar como
     *  favorita"). O visível é curto; este diz a consequência. */
    favoriteAction: string
  }
  /** Esconde as estrelas e deixa só o favorito. */
  ratingHidden?: boolean
}

export function RatingRow({
  value,
  favorite = false,
  onChange,
  onFavoriteChange,
  labels,
  ratingHidden = false,
}: RatingRowProps) {
  return (
    <div className="flex items-center justify-between gap-2">
      {/* `-ml-2` cancela o padding do primeiro alvo: sem isso a fileira nasce
          dois pixels dentro da margem e não alinha com o rótulo acima dela.
          O `div` continua ocupando o espaço quando vazio (as estrelas somem em
          "na fila"), e é ele que mantém o favorito à direita. */}
      <div className="-ml-2 flex items-center">
        {!ratingHidden &&
          [1, 2, 3, 4, 5].map((star) => {
            const on = (value ?? 0) >= star
            return (
              <button
                key={star}
                type="button"
                // A estrela da nota atual anuncia "apagar", não "dar nota 4".
                // Ela é a ÚNICA saída desde que o botão "Limpar" saiu da tela
                // (decisão do usuário, 09/08/2026), e uma saída que não se
                // anuncia não existe para quem não enxerga a fileira.
                aria-label={value === star ? labels.clear : labels.star(star)}
                aria-pressed={value === star}
                // TOCAR NA NOTA ATUAL LIMPA — e agora este gesto é a única
                // forma de apagar. Fica registrado o risco que ele carrega:
                // ele é invisível, e a tentativa natural de zerar (descer de 5
                // para 1) nunca chega ao zero, ela só troca a nota. Se
                // "não consigo tirar a nota" voltar a aparecer, é aqui.
                onClick={() => onChange(value === star ? undefined : star)}
                className="p-2.5 transition active:scale-90"
              >
                <Star
                  size={24}
                  weight={on ? 'fill' : 'regular'}
                  className={on ? 'text-rating' : 'text-muted'}
                />
              </button>
            )
          })}
      </div>

      {/* Botão de ALTERNÂNCIA, não ícone solto: `aria-pressed` faz o leitor de
          tela anunciar "Favorito, ativado", que é a informação inteira. O anel
          desenha o alvo — sem ele, um ícone com texto ao lado não parece
          tocável, e a pessoa procura outro lugar para tocar. */}
      <button
        type="button"
        aria-pressed={favorite}
        aria-label={labels.favoriteAction}
        onClick={() => onFavoriteChange(!favorite)}
        className={`inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-control px-3 transition active:scale-95 ${
          favorite
            ? 'text-favorite ring-1 ring-favorite/40'
            : 'text-muted ring-1 ring-ink/10'
        }`}
      >
        <Heart size={20} weight={favorite ? 'fill' : 'regular'} aria-hidden />
        <span className="text-label font-semibold">{labels.favorite}</span>
      </button>
    </div>
  )
}
