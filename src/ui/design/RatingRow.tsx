import { Heart, Star } from '@phosphor-icons/react'

/**
 * As cinco estrelas + o coração de "favorita".
 *
 * DOIS EIXOS NUMA LINHA SÓ, e é isso que o desenho precisa comunicar: a nota
 * responde "isto é bom?" e o coração responde "isto é meu". Três coisas separam
 * um do outro sem precisar de rótulo — a forma (coração, não estrela), a cor
 * (rosa, não amarelo) e o espaço maior antes dele. Sem as três, o coração vira
 * "a sexta estrela" e a pessoa acha que está dando nota 6.
 *
 * Alvos de 44px (WCAG 2.5.5): o ícone tem 26 e o resto é padding. Numa fileira
 * de seis, alvo pequeno erra de casa — e errar aqui grava a nota errada.
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
    favorite: string
  }
  /** Esconde as estrelas e deixa só o coração. */
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
    <div className="flex items-center justify-center gap-1">
      {!ratingHidden &&
        [1, 2, 3, 4, 5].map((star) => {
          const on = (value ?? 0) >= star
          return (
            <button
              key={star}
              type="button"
              aria-label={labels.star(star)}
              aria-pressed={value === star}
              // Tocar na nota atual limpa. O gesto continua existindo porque é
              // rápido para quem o conhece — mas ele NÃO é a resposta a "como
              // eu apago isto": é invisível, e quem tenta zerar baixando de 5
              // para 1 nunca chega ao zero. O botão "Limpar" ao lado do rótulo
              // é a resposta; isto aqui é o atalho.
              onClick={() => onChange(value === star ? undefined : star)}
              className="p-2 transition active:scale-90"
            >
              <Star
                size={26}
                weight={on ? 'fill' : 'regular'}
                className={on ? 'text-rating' : 'text-muted'}
              />
            </button>
          )
        })}

      <button
        type="button"
        aria-label={labels.favorite}
        aria-pressed={favorite}
        onClick={() => onFavoriteChange(!favorite)}
        // O respiro antes do coração só existe quando há estrelas à esquerda
        // para separar dele.
        className={`p-2 transition active:scale-90 ${ratingHidden ? '' : 'ml-3'}`}
      >
        <Heart
          size={26}
          weight={favorite ? 'fill' : 'regular'}
          className={favorite ? 'text-favorite' : 'text-muted'}
        />
      </button>
    </div>
  )
}
