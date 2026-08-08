import { Check, Plus } from '@phosphor-icons/react'

/**
 * O botão de adicionar/tirar da estante que fica SOBRE a capa.
 *
 * Ele existe porque tocar na capa passou a abrir o detalhe da obra, e sem um
 * atalho isso cobraria duas telas de quem já sabe o que quer. É o gesto rápido;
 * o detalhe é o gesto deliberado.
 *
 * O tamanho é o ponto: a área de toque tem 44px (WCAG 2.5.5), mas o círculo
 * visível tem 28px. O resto é padding invisível. Um alvo de 44px DESENHADO
 * ocuparia 40% da largura de uma célula do grid de três colunas — cor de marca
 * em cima da arte, que é justamente o que a gente evita.
 *
 * NÃO pode virar filho do botão que abre o detalhe: botão dentro de botão é
 * HTML inválido, e o leitor de tela anuncia uma coisa só. Os dois são irmãos
 * dentro de um container `relative`, e este vem depois para ficar por cima.
 */
export function CoverAction({
  added,
  label,
  onClick,
  className = '',
}: {
  /** Já está na estante? Muda o ícone e o que o toque faz. */
  added: boolean
  /** Nome acessível — muda com o estado ("Adicionar" / "Tirar da estante"). */
  label: string
  onClick: () => void
  className?: string
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={added}
      onClick={onClick}
      className={`absolute bottom-0 right-0 flex h-11 w-11 items-center justify-center ${className}`}
    >
      <span
        aria-hidden
        className={`flex h-7 w-7 items-center justify-center rounded-control backdrop-blur-sm transition active:scale-90 ${
          added
            ? 'bg-accent text-on-accent'
            : 'bg-inverse/85 text-on-inverse ring-1 ring-on-inverse/25'
        }`}
      >
        {added ? (
          <Check size={15} weight="bold" />
        ) : (
          <Plus size={15} weight="bold" />
        )}
      </span>
    </button>
  )
}
